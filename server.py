"""Pornește FitJurnal local și îl deschide în browser.

Rulează:  python3 server.py
Telefonul (pe același Wi-Fi) poate deschide adresa „Pe telefon” afișată la pornire.
"""
import http.server
import os
import socket
import socketserver
import webbrowser

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def lan_ip():
    """Adresa calculatorului în rețeaua locală (Wi-Fi)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # nu trimite nimic, doar alege interfața
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("0.0.0.0", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"FitJurnal rulează!")
    print(f"  Pe calculator: {url}")
    print(f"  Pe telefon:    http://{lan_ip()}:{PORT}  (același Wi-Fi)")
    print("Ctrl+C pentru oprire")
    webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer oprit.")
