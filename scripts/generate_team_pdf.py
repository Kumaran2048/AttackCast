"""
Generate a professional, executive-ready PDF report for AttackCast.
"""

import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

PDF_PATH = "AttackCast_Team_Overview_and_Architecture.pdf"

def create_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    c_primary = colors.HexColor("#0F172A")    # Slate 900
    c_accent  = colors.HexColor("#0284C7")    # Sky 600
    c_dark    = colors.HexColor("#1E293B")    # Slate 800
    c_muted   = colors.HexColor("#64748B")    # Slate 500
    c_card_bg = colors.HexColor("#F8FAFC")    # Slate 50
    c_line    = colors.HexColor("#E2E8F0")    # Slate 200

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=4,
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceAfter=15,
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6,
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_dark,
        spaceBefore=8,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_dark,
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        spaceAfter=3,
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark,
    )

    story = []

    # ── HEADER & TITLE ────────────────────────────────────────────────────────
    story.append(Paragraph("AttackCast: Predictive Cyber Attack Forecasting", title_style))
    story.append(Paragraph("AI-Powered Real-Time MITRE ATT&CK World Model & Horizon Forecaster", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=0, spaceAfter=12))

    # ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary & Problem Statement", h1_style))
    story.append(Paragraph(
        "Modern Security Operations Centers (SOCs) operate in a <b>reactive</b> state: analysts only investigate after an alert fires or damage is already done. "
        "<b>AttackCast</b> transforms defensive cybersecurity from <i>reactive detection</i> to <b>proactive, multi-step horizon forecasting</b>.",
        body_style
    ))
    story.append(Paragraph(
        "By analyzing streaming network packet flows in 30-second temporal windows, AttackCast's deep learning World Model (PyTorch GRU Neural Network) "
        "identifies the attacker's current kill-chain stage and forecasts where they will pivot <b>1 to 5 steps into the future</b>, recommending automated MITRE D3FEND countermeasures before critical impact occurs.",
        body_style
    ))

    story.append(Spacer(1, 8))

    # ── KEY INNOVATIONS & PILLARS ─────────────────────────────────────────────
    story.append(Paragraph("2. Key Innovations & Pillars", h1_style))

    pillars_data = [
        [
            Paragraph("<b>Pillar</b>", table_header_style),
            Paragraph("<b>What It Does</b>", table_header_style),
            Paragraph("<b>Impact on Security</b>", table_header_style),
        ],
        [
            Paragraph("<b>Horizon Forecasting ($K$-step reachability)</b>", table_cell_style),
            Paragraph("Calculates future state probability distributions ($k=1 \\dots 5$) using an empirical Markov transition matrix.", table_cell_style),
            Paragraph("Gives defenders lead-time to pre-emptively neutralize attacks.", table_cell_style),
        ],
        [
            Paragraph("<b>Explainable AI (XAI / SHAP)</b>", table_cell_style),
            Paragraph("Extracts top contributing flow features (Flow Bytes/s, PSH Flags, IAT Mean, etc.) with attribution scores.", table_cell_style),
            Paragraph("Eliminates 'black box' AI; builds instant trust for SOC analysts.", table_cell_style),
        ],
        [
            Paragraph("<b>MITRE D3FEND Countermeasures</b>", table_cell_style),
            Paragraph("Context-aware defense recommendations dynamically matched to the active kill-chain phase.", table_cell_style),
            Paragraph("Automates actionable response plans (D3-IPC, D3-DQ, etc.).", table_cell_style),
        ],
        [
            Paragraph("<b>What-If Counterfactual Sandbox</b>", table_cell_style),
            Paragraph("Interactive simulator allowing defenders to test hypothetical interventions (e.g. isolate host, block IP).", table_cell_style),
            Paragraph("Proves how a defense instantly drops downstream compromise risk.", table_cell_style),
        ],
    ]

    t_pillars = Table(pillars_data, colWidths=[1.8*inch, 3.2*inch, 2.0*inch])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, c_line),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [c_card_bg, colors.white]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_pillars)

    story.append(Spacer(1, 10))

    # ── 8 ATT&CK STAGES TAXONOMY ──────────────────────────────────────────────
    story.append(Paragraph("3. MITRE ATT&CK 8-Stage Taxonomy", h1_style))
    story.append(Paragraph("All streaming flows and real dataset samples are mapped to 8 standardized progression states:", body_style))

    stages_data = [
        [
            Paragraph("<b>Stage #</b>", table_header_style),
            Paragraph("<b>Stage Name</b>", table_header_style),
            Paragraph("<b>MITRE ID</b>", table_header_style),
            Paragraph("<b>Traffic Profile / Everyday Analogy</b>", table_header_style),
        ],
        [Paragraph("0", table_cell_style), Paragraph("Benign / Normal", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Regular daily network activity (safe baseline).", table_cell_style)],
        [Paragraph("1", table_cell_style), Paragraph("Reconnaissance", table_cell_style), Paragraph("T1046", table_cell_style), Paragraph("Port scanning, service discovery, high SYN flag rate.", table_cell_style)],
        [Paragraph("2", table_cell_style), Paragraph("Initial Access / Credential Access", table_cell_style), Paragraph("T1110", table_cell_style), Paragraph("SSH/RDP brute force, web vulnerability probing.", table_cell_style)],
        [Paragraph("3", table_cell_style), Paragraph("Execution / Foothold", table_cell_style), Paragraph("T1059", table_cell_style), Paragraph("Exploit payload delivery, reverse shell execution.", table_cell_style)],
        [Paragraph("4", table_cell_style), Paragraph("Command and Control (C2)", table_cell_style), Paragraph("T1071", table_cell_style), Paragraph("Periodic beaconing to external botnet controller IP.", table_cell_style)],
        [Paragraph("5", table_cell_style), Paragraph("Lateral Movement", table_cell_style), Paragraph("T1021", table_cell_style), Paragraph("Internal pivoting across hosts via SMB/WinRM/SSH.", table_cell_style)],
        [Paragraph("6", table_cell_style), Paragraph("Exfiltration", table_cell_style), Paragraph("T1041 / T1048", table_cell_style), Paragraph("Unusual spike in outbound bytes/sec to external IP.", table_cell_style)],
        [Paragraph("7", table_cell_style), Paragraph("Impact", table_cell_style), Paragraph("T1498 / T1499", table_cell_style), Paragraph("Critical denial of service (DDoS) or data encryption.", table_cell_style)],
    ]

    t_stages = Table(stages_data, colWidths=[0.6*inch, 2.2*inch, 1.0*inch, 3.2*inch])
    t_stages.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_dark),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_line),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [c_card_bg, colors.white]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_stages)

    story.append(PageBreak())

    # ── SYSTEM ARCHITECTURE & TECH STACK ──────────────────────────────────────
    story.append(Paragraph("4. End-to-End System Architecture", h1_style))
    story.append(Paragraph(
        "AttackCast operates on a modern, high-throughput fullstack architecture consisting of three core layers:",
        body_style
    ))

    arch_data = [
        [
            Paragraph("<b>Layer</b>", table_header_style),
            Paragraph("<b>Technology</b>", table_header_style),
            Paragraph("<b>Responsibilities</b>", table_header_style),
        ],
        [
            Paragraph("<b>AI / ML Brain</b>", table_cell_style),
            Paragraph("PyTorch, Scikit-Learn, NumPy, Pandas", table_cell_style),
            Paragraph(
                "• 2-layer GRU Neural Network (Sequence modeling)<br/>"
                "• Ingestion of 2,520,751 real flows (CICIDS-2017)<br/>"
                "• Feature scaling (16 CICFlowMeter features)<br/>"
                "• Empirical Markov Transition Matrix computation",
                table_cell_style
            ),
        ],
        [
            Paragraph("<b>Backend API & Replay</b>", table_cell_style),
            Paragraph("FastAPI, Uvicorn, WebSockets, Python 3.11", table_cell_style),
            Paragraph(
                "• Real-time WebSocket packet stream server (`/ws/replay`)<br/>"
                "• REST endpoints for health, metrics, what-if, countermeasures<br/>"
                "• PCAP file analysis and feature extraction engine",
                table_cell_style
            ),
        ],
        [
            Paragraph("<b>Frontend & Cockpit</b>", table_cell_style),
            Paragraph("React, TypeScript, TailwindCSS, Lucide, Vite", table_cell_style),
            Paragraph(
                "• Live attack monitor cockpit with threat level gauge<br/>"
                "• Interactive Host Interaction Network Graph<br/>"
                "• What-If Counterfactual Sandbox & Model Performance hub<br/>"
                "• Fully responsive mobile sidebar drawer",
                table_cell_style
            ),
        ],
    ]

    t_arch = Table(arch_data, colWidths=[1.5*inch, 2.0*inch, 3.5*inch])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_line),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [c_card_bg, colors.white]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_arch)

    story.append(Spacer(1, 10))

    # ── REAL DATASET & MODEL PROOF ────────────────────────────────────────────
    story.append(Paragraph("5. Real Dataset & Model Verification", h1_style))
    story.append(Paragraph(
        "AttackCast does not rely on random values. It is trained on real, empirical benchmark network data:",
        body_style
    ))
    story.append(Paragraph("• <b>Benchmark Dataset</b>: CICIDS-2017 (717 MB raw CSV, 2,520,751 total network flows).", bullet_style))
    story.append(Paragraph("• <b>Extracted Features (16)</b>: Destination Port, Flow Duration, Flow Bytes/s, Flow Packets/s, Fwd/Bwd Packet Length Means, Flow IAT Mean, Flag Counts (FIN, PSH, ACK), Initial Window Bytes, Active/Idle Means.", bullet_style))
    story.append(Paragraph("• <b>Trained PyTorch Model Checkpoint</b>: <code>artifacts/models/world_model.pt</code> (178 KB binary).", bullet_style))
    story.append(Paragraph("• <b>Empirical Transition Matrix</b>: Real probability distribution of attack phase shifts.", bullet_style))

    story.append(Spacer(1, 10))

    # ── APPLICATION PAGES TOUR ────────────────────────────────────────────────
    story.append(Paragraph("6. Platform UI Capabilities Walkthrough", h1_style))

    pages_tour = [
        [Paragraph("<b>Page / View</b>", table_header_style), Paragraph("<b>Key Analyst Features</b>", table_header_style)],
        [
            Paragraph("<b>Live Monitor (`/live`)</b>", table_cell_style),
            Paragraph("Mission control showing live stage, dial alert levels (Green ➔ Red), active flagged flows, top SHAP features, and dynamic D3FEND countermeasures.", table_cell_style),
        ],
        [
            Paragraph("<b>Campaign / Host Graph (`/campaign`)</b>", table_cell_style),
            Paragraph("Interactive network topology graph with live risk-weighted nodes and flow edges for single-host and multi-host coordinated attacks.", table_cell_style),
        ],
        [
            Paragraph("<b>What-If Sandbox (`/whatif`)</b>", table_cell_style),
            Paragraph("Defensive counterfactual simulator — test defensive interventions (e.g. isolate host, block IP) and see risk drop in real time.", table_cell_style),
        ],
        [
            Paragraph("<b>Model Performance (`/performance`)</b>", table_cell_style),
            Paragraph("Full AI validation hub: dataset card, confusion matrix, LR baseline vs GRU comparison, and training convergence curves.", table_cell_style),
        ],
        [
            Paragraph("<b>PCAP Upload (`/pcap`)</b>", table_cell_style),
            Paragraph("Drag-and-drop network capture ingestion hub for custom PCAP files.", table_cell_style),
        ],
    ]

    t_tour = Table(pages_tour, colWidths=[2.2*inch, 4.8*inch])
    t_tour.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_dark),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_line),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [c_card_bg, colors.white]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_tour)

    story.append(Spacer(1, 12))

    # ── DEPLOYMENT LINKS & SUMMARY ────────────────────────────────────────────
    story.append(Paragraph("7. Live Production Deployments & Access URLs", h1_style))
    story.append(Paragraph("All services, cloud models, and interfaces are deployed and live on the public web:", body_style))

    links_data = [
        [
            Paragraph("<b>Component / Service</b>", table_header_style),
            Paragraph("<b>Live URL</b>", table_header_style),
            Paragraph("<b>Environment / Host</b>", table_header_style),
        ],
        [
            Paragraph("<b>Frontend Web Cockpit</b>", table_cell_style),
            Paragraph("<font color='#0284C7'><u>https://attack-cast-neon.vercel.app/</u></font>", table_cell_style),
            Paragraph("Vercel (Global Edge Network)", table_cell_style),
        ],
        [
            Paragraph("<b>Cloud Backend API</b>", table_cell_style),
            Paragraph("<font color='#0284C7'><u>https://attackcast.onrender.com/</u></font>", table_cell_style),
            Paragraph("Render Cloud (FastAPI + PyTorch)", table_cell_style),
        ],
        [
            Paragraph("<b>Interactive Swagger Docs</b>", table_cell_style),
            Paragraph("<font color='#0284C7'><u>https://attackcast.onrender.com/docs</u></font>", table_cell_style),
            Paragraph("OpenAPI Interactive Playground", table_cell_style),
        ],
        [
            Paragraph("<b>Live API Health & Dataset Check</b>", table_cell_style),
            Paragraph("<font color='#0284C7'><u>https://attackcast.onrender.com/api/health</u></font>", table_cell_style),
            Paragraph("Returns 2.52M flow dataset status", table_cell_style),
        ],
        [
            Paragraph("<b>Live Model Metrics & Transition Matrix</b>", table_cell_style),
            Paragraph("<font color='#0284C7'><u>https://attackcast.onrender.com/api/metrics</u></font>", table_cell_style),
            Paragraph("Returns F1 & transition matrix", table_cell_style),
        ],
        [
            Paragraph("<b>GitHub Source Repository</b>", table_cell_style),
            Paragraph("<font color='#0284C7'><u>https://github.com/Kumaran2048/AttackCast</u></font>", table_cell_style),
            Paragraph("GitHub (Full codebase + weights)", table_cell_style),
        ],
    ]

    t_links = Table(links_data, colWidths=[2.2*inch, 3.2*inch, 1.6*inch])
    t_links.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_line),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [c_card_bg, colors.white]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_links)

    doc.build(story)
    print(f"[OK] Generated {PDF_PATH} successfully!")

if __name__ == "__main__":
    create_pdf()
