# EOS slice template registry

| Version | File                                                           | Tag                           | SHA-256                                                          | Introducing commit                   |
| ------- | -------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| 1.0     | docs/rebuild/templates/EOS_SLICE_BUILD_MASTER_TEMPLATE_v1.0.md | eos-slice-build-template-v1.0 | 650eb15c09611823bdc865273d1ab53551b581b6aa90eb9a76472062fea271e4 | dbbbdb1c5415ebdf51dda2550d37f004f89a60fb |

Rules:

- Never edit version 1.0 silently.
- A material change needs a new version, filename, checksum, changelog, CEO approval and annotated tag.
- An instantiated slice contract must not modify the master template.
- The verifier rejects a slice contract whose declared template checksum does not match this registry.

S01 contract checksum: see `docs/rebuild/eos-s01/EOS_S01_CONTRACT_CHECKSUM.txt`.
