# Data Card

Target sources from the supplied build specification:
- CIC-IDS-2018
- CTU-13
- raw PCAP via Scapy

The repository does not bundle third-party datasets. Development mode uses an explicitly labelled synthetic dataset so the entire application can be exercised offline. Replace it with the actual datasets before making claims about real traffic.

Known limitation: dataset versions can differ in available IP/port columns and label names; the ingestion layer must inspect and record actual columns.
