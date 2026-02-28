#!/usr/bin/env python3
"""
Range リクエスト（HTTP Byte Serving）に対応した簡易 HTTP サーバー。
PMTiles が Range で必要なバイト範囲だけ取得できるようにする。
使い方: python3 serve_range.py [port]
  例: python3 serve_range.py 5500
"""
import http.server
import re
import os
import sys


class RangeRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Range ヘッダーを処理し、206 Partial Content と Content-Length を返すハンドラ。"""

    def send_head(self):
        if self.path != "/" and not self.path.startswith("/"):
            self.path = "/" + self.path
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            for index in "index.html", "index.htm":
                index = os.path.join(path, index)
                if os.path.exists(index):
                    path = index
                    break
            else:
                return self.list_directory(path)
        if not os.path.exists(path):
            self.send_error(404, "File not found")
            return None
        if os.path.isdir(path):
            self.send_error(404, "File not found")
            return None

        f = None
        try:
            f = open(path, "rb")
            fs = os.fstat(f.fileno())
            size = fs.st_size

            range_header = self.headers.get("Range")
            if range_header and range_header.startswith("bytes="):
                # bytes=start-end 形式をパース
                m = re.match(r"bytes=(\d*)-(\d*)", range_header)
                if m:
                    start_str, end_str = m.groups()
                    start = int(start_str) if start_str else 0
                    end = int(end_str) if end_str else size - 1
                    if end >= size:
                        end = size - 1
                    if start > end:
                        self.send_error(416, "Requested Range Not Satisfiable")
                        return None
                    length = end - start + 1
                    f.seek(start)
                    self.send_response(206, "Partial Content")
                    self.send_header("Content-Type", self.guess_type(path))
                    self.send_header("Content-Length", str(length))
                    self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
                    self.send_header("Accept-Ranges", "bytes")
                    self.end_headers()
                    return f
            # Range なし: 通常の 200 で Content-Length を付与
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Length", str(size))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            return f
        except OSError:
            if f:
                f.close()
            raise

    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))


def run(port=5500):
    server_address = ("", port)
    httpd = http.server.HTTPServer(server_address, RangeRequestHandler)
    print("Serving HTTP with Range support on 0.0.0.0 port %s (http://0.0.0.0:%s/) ..." % (port, port))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nKeyboard interrupt received, exiting.")
        httpd.shutdown()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    run(port)
