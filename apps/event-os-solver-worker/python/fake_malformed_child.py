/**
 * Truncated / crash fixture child for Journey C — not a real CP-SAT solve.
 * Writes a truncated frame then exits non-zero.
 */
import os
import struct
import sys


def main() -> None:
    # Consume stdin without needing a full request.
    try:
        sys.stdin.buffer.read(64)
    except Exception:
        pass
    mode = os.environ.get("CPSAT_FAKE_CHILD_MODE", "truncate")
    # fd 3 is the framed response channel when spawned by the supervisor.
    try:
        fd = 3
        if mode == "crash":
            os._exit(97)
        # Truncated: length header claims more bytes than we write.
        body = b'{"type":"final","ok":true,"payload":{"result":"FEASIBLE"'
        header = struct.pack(">I", len(body) + 200)
        os.write(fd, header + body)
        os._exit(1)
    except Exception:
        os._exit(2)


if __name__ == "__main__":
    main()
