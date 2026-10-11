import urllib.request
import urllib.parse
import json
import time
import struct
import os

def create_geotiff_bytes(width=512, height=512, scale_m=10.0):
    # Construct genuine little-endian GeoTIFF buffer
    num_tags = 14
    header_size = 8
    ifd_size = 2 + num_tags * 12 + 4
    data_offset = header_size + ifd_size + 256
    samples = 3
    bytes_per_sample = 2
    raster_bytes = width * height * samples * bytes_per_sample
    total_size = data_offset + raster_bytes

    buf = bytearray(total_size)

    # Magic bytes
    struct.pack_into('<HHI', buf, 0, 0x4949, 42, 8)

    offset = 8
    struct.pack_into('<H', buf, offset, num_tags)
    offset += 2

    extra_offset = header_size + ifd_size

    def write_tag(tag, tag_type, count, val_or_offset):
        nonlocal offset
        struct.pack_into('<HHII', buf, offset, tag, tag_type, count, val_or_offset)
        offset += 12

    # IFD Tags
    write_tag(256, 4, 1, width) # Width
    write_tag(257, 4, 1, height) # Height
    write_tag(258, 3, 3, extra_offset) # BitsPerSample
    write_tag(259, 3, 1, 1) # Compression
    write_tag(262, 3, 1, 2) # Photometric RGB
    write_tag(273, 4, 1, data_offset) # StripOffsets
    write_tag(277, 3, 1, samples) # SamplesPerPixel
    write_tag(278, 4, 1, height) # RowsPerStrip
    write_tag(279, 4, 1, raster_bytes) # StripByteCounts
    write_tag(282, 5, 1, extra_offset + 16) # XResolution
    write_tag(283, 5, 1, extra_offset + 24) # YResolution
    write_tag(33550, 12, 3, extra_offset + 32) # ModelPixelScaleTag
    write_tag(33922, 12, 6, extra_offset + 64) # ModelTiepointTag
    write_tag(34735, 3, 8, extra_offset + 120) # GeoKeyDirectoryTag

    struct.pack_into('<I', buf, offset, 0) # End of IFD

    # Extra data: BitsPerSample [16, 16, 16]
    struct.pack_into('<HHH', buf, extra_offset, 16, 16, 16)

    # ModelPixelScaleTag [scale_m, scale_m, 0.0]
    struct.pack_into('<ddd', buf, extra_offset + 32, scale_m, scale_m, 0.0)

    # ModelTiepointTag [0, 0, 0, 500000.0, 4000000.0, 0.0] (UTM meters)
    struct.pack_into('<dddddd', buf, extra_offset + 64, 0.0, 0.0, 0.0, 500000.0, 4000000.0, 0.0)

    # Raster data (water and vegetation reflectance values)
    pixel_idx = data_offset
    for y in range(height):
        for x in range(width):
            dist = abs((x / width) - 0.5)
            is_water = dist < 0.12 # 24% width flood channel
            if is_water:
                b4, b3, b2 = 320, 640, 980 # Water signature
            else:
                b4, b3, b2 = 1420, 1150, 620 # Land signature
            struct.pack_into('<HHH', buf, pixel_idx, b4, b3, b2)
            pixel_idx += 6

    return bytes(buf)

def post_multipart(url, fields, files):
    boundary = '----WebKitFormBoundary' + hex(int(time.time() * 1000))[2:]
    body = bytearray()

    for k, v in fields.items():
        body.extend(f'--{boundary}\r\n'.encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode('utf-8'))
        body.extend(f'{v}\r\n'.encode('utf-8'))

    for k, (filename, file_bytes) in files.items():
        body.extend(f'--{boundary}\r\n'.encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode('utf-8'))
        body.extend(b'Content-Type: image/tiff\r\n\r\n')
        body.extend(file_bytes)
        body.extend(b'\r\n')

    body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req) as resp:
            elapsed = (time.time() - t0) * 1000
            res_body = resp.read().decode('utf-8')
            return resp.status, json.loads(res_body), elapsed
    except urllib.error.HTTPError as e:
        elapsed = (time.time() - t0) * 1000
        res_body = e.read().decode('utf-8')
        return e.code, json.loads(res_body), elapsed

def main():
    print("Step 1: Generating standard Sentinel-2 GeoTIFF chip (512x512, 10m GSD)...")
    tiff_bytes = create_geotiff_bytes(512, 512, 10.0)
    print(f"Generated GeoTIFF: {len(tiff_bytes)} bytes")

    print("\nStep 2: Calling /api/verify-image...")
    status, verify_data, elapsed_v = post_multipart(
        'http://localhost:3000/api/verify-image',
        {},
        {'file': ('Spain_Sentinel2_B4B3B2_512.tif', tiff_bytes)}
    )
    print(f"Verification HTTP Status: {status} in {elapsed_v:.1f}ms")
    print(f"Verification ID: {verify_data.get('verification_id')}")
    print(f"Status: {verify_data.get('status')}")
    print(f"Accepted for inference: {verify_data.get('accepted_for_inference')}")
    print(f"Dimensions check: {verify_data.get('checks', {}).get('dimensions')}")
    print(f"Channels check: {verify_data.get('checks', {}).get('channels')}")

    assert status == 200, f"Expected 200, got {status}"
    assert verify_data.get('accepted_for_inference') == True, "Expected accepted_for_inference=True"
    v_id = verify_data['verification_id']

    print("\nStep 3: Calling /api/analyze with verified token...")
    status_a, analyze_data, elapsed_a = post_multipart(
        'http://localhost:3000/api/analyze',
        {'verification_id': v_id, 'threshold': '0.5'},
        {'file': ('Spain_Sentinel2_B4B3B2_512.tif', tiff_bytes)}
    )
    print(f"Analyze HTTP Status: {status_a} in {elapsed_a:.1f}ms")
    print(json.dumps(analyze_data, indent=2))

    print("\nStep 4: Testing Geographic CRS GeoTIFF (EPSG:4326 in Spain, latitude ~39.5°N)...")
    # scale_deg = 8.983152841195215e-05 (approx 10m at equator)
    scale_deg = 8.983152841195215e-05
    # Construct a geographic TIFF
    geo_tiff_bytes = bytearray(tiff_bytes)
    extra_offset = 8 + (2 + 14 * 12 + 4)
    # ModelPixelScaleTag
    struct.pack_into('<ddd', geo_tiff_bytes, extra_offset + 32, scale_deg, scale_deg, 0.0)
    # ModelTiepointTag with latitude 39.5° N in Spain
    struct.pack_into('<dddddd', geo_tiff_bytes, extra_offset + 64, 0.0, 0.0, 0.0, -0.37, 39.5, 0.0)

    status_gv, verify_data_g, _ = post_multipart(
        'http://localhost:3000/api/verify-image',
        {},
        {'file': ('Spain_6537196_S2Hand_Geographic.tif', bytes(geo_tiff_bytes))}
    )
    assert status_gv == 200
    v_id_g = verify_data_g['verification_id']

    status_ga, analyze_data_g, _ = post_multipart(
        'http://localhost:3000/api/analyze',
        {'verification_id': v_id_g, 'threshold': '0.5'},
        {'file': ('Spain_6537196_S2Hand_Geographic.tif', bytes(geo_tiff_bytes))}
    )
    print(f"Geographic GeoTIFF Area Calculation Result:")
    print(f"  Physical Area (ha): {analyze_data_g.get('physical_area_ha')}")
    print(f"  Calculation Method: {analyze_data_g.get('area_calculation_method')}")
    print(f"  Notes: {analyze_data_g.get('physical_area_notes')}")
    assert 'GEODESIC_WGS84_LAT_39.50N' in analyze_data_g.get('area_calculation_method')
    # At latitude 39.5 N, cos(39.5) = 0.7716, so area should be ~77% of 2621.44 ha = ~2022 ha
    print(f"  Ratio vs Equator/Projected: {analyze_data_g.get('physical_area_ha') / 2621.44:.4f}")

    print("\nAll live verification & inference checks passed successfully!")

if __name__ == '__main__':
    main()
