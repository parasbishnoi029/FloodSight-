import sys
import re
import urllib.request
import urllib.parse
import os

def download_gdrive_file(file_id: str, destination: str):
    base_url = "https://docs.google.com/uc?export=download"

    # Step 1: Request initial download page
    req = urllib.request.Request(f"{base_url}&id={file_id}", headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    try:
        with urllib.request.urlopen(req) as resp:
            headers = resp.info()
            content_disposition = headers.get('Content-Disposition', '')
            cookie_headers = headers.get_all('Set-Cookie') or []
            cookie_str = "; ".join([c.split(';')[0] for c in cookie_headers])

            # If small file, it downloads directly
            if 'attachment' in content_disposition:
                os.makedirs(os.path.dirname(os.path.abspath(destination)), exist_ok=True)
                with open(destination, 'wb') as f:
                    downloaded = 0
                    while chunk := resp.read(1048576):
                        f.write(chunk)
                        downloaded += len(chunk)
                print(f"Downloaded directly to {destination} ({os.path.getsize(destination)} bytes)")
                return True

            html = resp.read().decode('utf-8', errors='ignore')

            # Look for form with action="https://drive.usercontent.google.com/download"
            form_match = re.search(r'<form\s+id="download-form"\s+action="([^"]+)"', html) or re.search(r'<form[^>]+action="([^"]+)"', html)
            if form_match:
                action_url = form_match.group(1)
                inputs = re.findall(r'<input\s+type="hidden"\s+name="([^"]+)"\s+value="([^"]+)"', html)
                params = {k: v for k, v in inputs}
                if 'confirm' not in params:
                    params['confirm'] = 't'

                query_str = urllib.parse.urlencode(params)
                full_download_url = f"{action_url}?{query_str}" if '?' not in action_url else f"{action_url}&{query_str}"
                print(f"Submitting download confirmation: {full_download_url[:100]}...")

                req2 = urllib.request.Request(full_download_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': cookie_str
                })

                with urllib.request.urlopen(req2) as resp2:
                    os.makedirs(os.path.dirname(os.path.abspath(destination)), exist_ok=True)
                    with open(destination, 'wb') as f:
                        total_bytes = 0
                        while chunk := resp2.read(1048576): # 1MB chunks
                            f.write(chunk)
                            total_bytes += len(chunk)
                            if total_bytes % (50 * 1048576) == 0:
                                print(f"Progress: {total_bytes / (1024*1024):.1f} MB...")
                    print(f"Successfully downloaded {destination}: {total_bytes} bytes ({total_bytes / (1024*1024):.1f} MB)")
                    return True
            else:
                print("Could not find download form in response HTML.")
                return False

    except Exception as e:
        print(f"Download failed with exception: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 download_drive_file.py <FILE_ID> <DESTINATION>")
        sys.exit(1)
    download_gdrive_file(sys.argv[1], sys.argv[2])
