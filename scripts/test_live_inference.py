import urllib.request
import urllib.parse
import json
import time
import struct
import math

def create_geotiff_bytes(width=512, height=512, scale_m=10.0, mode='mixed'):
    # Modes: 'all_flood', 'no_flood', 'mixed'
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

    struct.pack_into('<HHH', buf, extra_offset, 16, 16, 16)
    struct.pack_into('<ddd', buf, extra_offset + 32, scale_m, scale_m, 0.0)
    struct.pack_into('<dddddd', buf, extra_offset + 64, 0.0, 0.0, 0.0, 500000.0, 4000000.0, 0.0)

    pixel_idx = data_offset
    for y in range(height):
        for x in range(width):
            if mode == 'all_flood':
                b4, b3, b2 = 320, 640, 980 # All water
            elif mode == 'no_flood':
                b4, b3, b2 = 1420, 1150, 620 # All land
            else: # mixed
                dist = abs((x / width) - 0.5)
                if dist < 0.12:
                    b4, b3, b2 = 320, 640, 980 # Water channel (24%)
                else:
                    b4, b3, b2 = 1420, 1150, 620 # Land
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

def run_test_case(name, mode, scale_m=10.0, is_geo=False):
    print(f"\n--- Running test: {name} (mode={mode}) ---")
    tiff_bytes = create_geotiff_bytes(512, 512, scale_m, mode=mode)
    if is_geo:
        # Scale in degrees at latitude 39.5 N
        geo_tiff = bytearray(tiff_bytes)
        extra_offset = 8 + (2 + 14 * 12 + 4)
        scale_deg = 8.983152841195215e-05
        struct.pack_into('<ddd', geo_tiff, extra_offset + 32, scale_deg, scale_deg, 0.0)
        struct.pack_into('<dddddd', geo_tiff, extra_offset + 64, 0.0, 0.0, 0.0, -0.37, 39.5, 0.0)
        tiff_bytes = bytes(geo_tiff)

    status_v, v_data, _ = post_multipart(
        'http://localhost:3000/api/verify-image',
        {},
        {'file': (f'{name}.tif', tiff_bytes)}
    )
    assert status_v == 200
    v_id = v_data['verification_id']

    status_a, a_data, elapsed_ms = post_multipart(
        'http://localhost:3000/api/analyze',
        {'verification_id': v_id, 'threshold': '0.5'},
        {'file': (f'{name}.tif', tiff_bytes)}
    )
    assert status_a == 200
    print(f"Status: {status_a} ({elapsed_ms:.1f}ms)")
    print(f"Analysis ID: {a_data.get('analysis_id')}")
    print(f"Flood Detected: {a_data.get('flood_detected')}")
    print(f"Flood Pixels: {a_data.get('flood_pixel_count')} / {a_data.get('valid_pixel_count')} ({a_data.get('coverage_percent')}%)")
    print(f"Mean Confidence: {a_data.get('confidence_mean')}")
    print(f"Physical Area: {a_data.get('physical_area_ha')} ha")
    print(f"Method: {a_data.get('area_calculation_method')}")
    return a_data

def main():
    # 1. Mixed prediction (24% water channel)
    mixed_res = run_test_case('Sentinel2_Mixed_Scene', 'mixed')
    assert mixed_res['flood_detected'] == True
    assert 23.5 <= mixed_res['coverage_percent'] <= 24.5
    assert mixed_res['flood_pixel_count'] == 62976
    assert mixed_res['physical_area_ha'] == 629.76

    # 2. All-flood prediction (100% water)
    flood_res = run_test_case('Sentinel2_All_Flood_Scene', 'all_flood')
    assert flood_res['flood_detected'] == True
    assert flood_res['coverage_percent'] == 100.0
    assert flood_res['flood_pixel_count'] == 262144
    assert flood_res['physical_area_ha'] == 2621.44

    # 3. No-flood prediction (0% water, all land)
    land_res = run_test_case('Sentinel2_No_Flood_Scene', 'no_flood')
    assert land_res['flood_detected'] == False
    assert land_res['coverage_percent'] == 0.0
    assert land_res['flood_pixel_count'] == 0
    assert land_res['physical_area_ha'] == 0.0

    # 4. Mixed in Spain with Geographic Degree CRS
    geo_res = run_test_case('Spain_Geographic_Mixed_Scene', 'mixed', is_geo=True)
    assert geo_res['flood_detected'] == True
    assert 23.5 <= geo_res['coverage_percent'] <= 24.5
    # Area should be 629.76 * cos(39.5) = ~484 ha
    assert 480.0 <= geo_res['physical_area_ha'] <= 490.0
    assert 'GEODESIC_WGS84_LAT_39.50N' in geo_res['area_calculation_method']

    print("\nAll regression scenarios (Mixed, All-Flood, No-Flood, Geographic CRS) verified successfully!")

if __name__ == '__main__':
    main()
