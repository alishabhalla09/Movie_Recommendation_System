import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Skip header & footer on cover page
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#888888"))

        # Top Header
        self.drawString(54, 11 * inch - 36, "STREAMFLIX — ARCHITECTURE & RECOMMENDATION SYSTEM DOCUMENTATION")
        self.setStrokeColor(colors.HexColor("#E50914"))
        self.setLineWidth(1)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Bottom Footer
        self.setStrokeColor(colors.HexColor("#333333"))
        self.setLineWidth(0.5)
        self.line(54, 45, 8.5 * inch - 54, 45)
        
        self.setFont("Helvetica", 8)
        self.drawString(54, 32, "Confidential & Proprietary • Engineering & ML Architecture Guide")
        self.drawRightString(8.5 * inch - 54, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def create_documentation_pdf(filename="StreamFlix_Full_Project_Documentation.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#E50914") # Netflix Red
    dark_bg = colors.HexColor("#141414")
    card_bg = colors.HexColor("#F8F9FA")
    text_dark = colors.HexColor("#1A1A1A")
    text_muted = colors.HexColor("#555555")

    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#FFFFFF"),
        alignment=1, # Centered
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#CCCCCC"),
        alignment=1,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1F2937"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    h3_style = ParagraphStyle(
        "Heading3_Custom",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#374151"),
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=text_dark,
        spaceBefore=3,
        spaceAfter=5,
    )

    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=text_dark,
        leftIndent=15,
        firstLineIndent=-10,
        spaceBefore=2,
        spaceAfter=2,
    )

    code_style = ParagraphStyle(
        "CodeBlock",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#111827"),
    )

    callout_style = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1F2937"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_body_style = ParagraphStyle(
        "TableBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=text_dark,
    )

    story = []

    # ═════════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ═════════════════════════════════════════════════════════════════════════
    cover_data = [
        [
            Paragraph("<font size=10 color='#E50914'><b>ENTERPRISE SYSTEM DOCUMENTATION</b></font>", subtitle_style),
        ],
        [
            Spacer(1, 15),
            Paragraph("STREAMFLIX", title_style),
            Paragraph("<b>Next-Generation AI Movie Discovery & Hybrid Recommendation System</b>", subtitle_style),
            Spacer(1, 15),
        ],
        [
            Paragraph(
                "<font color='#999999' size=9>"
                "A Complete Production Architecture, Machine Learning Pipeline, TMDB API Integration, "
                "Collaborative Filtering Algorithm, and Database Design Blueprint"
                "</font>",
                subtitle_style
            )
        ]
    ]

    cover_table = Table(cover_data, colWidths=[500])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#111111")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 35),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 35),
        ('LEFTPADDING', (0, 0), (-1, -1), 25),
        ('RIGHTPADDING', (0, 0), (-1, -1), 25),
    ]))

    story.append(Spacer(1, 40))
    story.append(cover_table)
    story.append(Spacer(1, 30))

    # Meta Details Box
    meta_data = [
        [Paragraph("<b>Document Version:</b>", table_body_style), Paragraph("v2.4 (Production Specification)", table_body_style)],
        [Paragraph("<b>Core Frameworks:</b>", table_body_style), Paragraph("React 18, Node.js Express 5, Python 3.10 FastAPI", table_body_style)],
        [Paragraph("<b>ML Algorithms:</b>", table_body_style), Paragraph("Implicit ALS Matrix Factorization + TF-IDF Cosine Similarity", table_body_style)],
        [Paragraph("<b>Database & ORM:</b>", table_body_style), Paragraph("PostgreSQL 16 + Drizzle ORM (Type-safe migrations)", table_body_style)],
        [Paragraph("<b>External APIs:</b>", table_body_style), Paragraph("TMDB v3 API (Catalog/Videos) + YouTube Embedded Player", table_body_style)],
        [Paragraph("<b>Security Model:</b>", table_body_style), Paragraph("JWT Bearer Authentication + bcrypt password hashing", table_body_style)],
        [Paragraph("<b>Target Audience:</b>", table_body_style), Paragraph("Full-Stack Developers, ML Engineers, Technical Evaluators", table_body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[150, 350])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F3F4F6")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(meta_table)

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 1: EXECUTIVE OVERVIEW
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Summary & Project Vision", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))
    
    story.append(Paragraph(
        "<b>StreamFlix</b> is a production-grade, full-stack video discovery and entertainment recommendation platform. "
        "Unlike academic toy recommenders that run solely inside Jupyter Notebooks on synthetic datasets, StreamFlix is an "
        "end-to-end, multi-service streaming platform modeled after modern platforms like Netflix and Amazon Prime Video.",
        body_style
    ))
    story.append(Paragraph(
        "The system combines a <b>React 18 + Vite frontend</b> featuring a responsive dark cinematic theme, an <b>Express 5 API server</b> "
        "with OpenAPI 3.1 contracts and Drizzle ORM, a dedicated <b>Python FastAPI Microservice</b> executing Implicit Alternating Least "
        "Squares (ALS) collaborative filtering, and a <b>PostgreSQL 16 relational database</b>.",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Key Differentiators & Highlights:", h2_style))
    story.append(Paragraph("• <b>Dual-Engine Hybrid Recommendation:</b> Blends implicit collaborative interaction matrices with content-based TF-IDF cosine feature vectors and popularity velocity.", bullet_style))
    story.append(Paragraph("• <b>Live TMDB v3 API Pipeline:</b> Automated catalog ingestion, trailer extraction, metadata enrichment, cast & director resolution, and deduplication.", bullet_style))
    story.append(Paragraph("• <b>Embedded 16:9 Trailer Playback:</b> Native modal trailer player using YouTube privacy-enhanced embedded players.", bullet_style))
    story.append(Paragraph("• <b>Netflix-Grade UI/UX:</b> Dynamic hero banners, hover zoom preview cards, continue-watching progress tracking, instant search filtering, and genre browsers.", bullet_style))
    story.append(Paragraph("• <b>Zero Cold-Start Vulnerability:</b> Intelligent fallbacks utilizing genre-based popularity, Bayesian-weighted ratings, and trending recency curves.", bullet_style))

    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 2: TECHNOLOGY STACK BREAKDOWN
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Complete Technology Stack", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    tech_table_data = [
        [Paragraph("<b>Layer / Domain</b>", table_header_style), Paragraph("<b>Technologies & Libraries</b>", table_header_style), Paragraph("<b>Purpose & Architectural Rationale</b>", table_header_style)],
        [
            Paragraph("<b>Frontend Client</b>", table_body_style),
            Paragraph("React 18, TypeScript, Vite, TailwindCSS v4, Framer Motion, Radix UI, TanStack Query, Wouter", table_body_style),
            Paragraph("High-performance Single Page Application (SPA), responsive dark UI, client-side caching, cinematic micro-animations.", table_body_style)
        ],
        [
            Paragraph("<b>Backend API Server</b>", table_body_style),
            Paragraph("Node.js 20, Express 5, Drizzle ORM, Zod, OpenAPI 3.1, Orval Codegen, Pino Logger", table_body_style),
            Paragraph("Type-safe REST API server, request validation, authentication middleware, TMDB catalog sync, watch progress tracking.", table_body_style)
        ],
        [
            Paragraph("<b>ML Recommender Microservice</b>", table_body_style),
            Paragraph("Python 3.10, FastAPI, Uvicorn, Implicit (ALS), NumPy, SciPy (CSR Sparse), Scikit-Learn, Pandas, SQLAlchemy", table_body_style),
            Paragraph("High-throughput async ML microservice. Trains 64-latent-factor implicit collaborative models and computes real-time user recommendations.", table_body_style)
        ],
        [
            Paragraph("<b>Database</b>", table_body_style),
            Paragraph("PostgreSQL 16 (Relational Engine), Drizzle Kit migrations", table_body_style),
            Paragraph("ACID transactional persistence for items, users, user interactions, watchlist, user reviews, and video playback positions.", table_body_style)
        ],
        [
            Paragraph("<b>External Integrations</b>", table_body_style),
            Paragraph("The Movie Database (TMDB) v3 API, YouTube Embedded Player API", table_body_style),
            Paragraph("Real-world movie metadata, high-resolution artwork (posters & backdrops), credits, keywords, and official video trailers.", table_body_style)
        ],
    ]

    tech_table = Table(tech_table_data, colWidths=[90, 160, 250])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 3: SYSTEM ARCHITECTURE & WORKFLOW
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. System Architecture & High-Level Workflow", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    arch_box = [
        [Paragraph(
            "<b>Architecture Workflow:</b><br/>"
            "1. <b>Client Request:</b> User navigates to StreamFlix UI (Vite SPA on port 5173).<br/>"
            "2. <b>API Gateway:</b> Frontend requests rows from Node.js Express API (port 5001) with JWT Bearer Token.<br/>"
            "3. <b>Hybrid Ranking Pipeline:</b><br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;a. Express checks user profile & query parameters.<br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;b. Calls Python FastAPI (port 8000) for personalized ALS collaborative scores.<br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;c. Computes content cosine similarity against user history from TF-IDF feature vectors.<br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;d. Blends ALS (45%) + Content (35%) + Popularity (10%) + Rating (10%).<br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;e. Applies diversity filters to prevent genre clustering.<br/>"
            "4. <b>Response:</b> Enriched JSON response with full poster URLs, backdrop paths, and YouTube trailer keys.<br/>"
            "5. <b>Watch Tracking:</b> As user watches trailers or moves progress slider, progress is saved to <code>watch_progress</code>.",
            callout_style
        )]
    ]
    arch_table = Table(arch_box, colWidths=[500])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#3B82F6")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(arch_table)

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 4: HOW THE RECOMMENDATION ENGINE WORKS
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. How the Recommendation Engine Works & How We Train the Model", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    story.append(Paragraph(
        "Recommendation engines generally suffer from two major flaws: collaborative filtering fails on new users/items (cold-start problem), "
        "while content-based filtering over-recommends identical items (filter bubbles). StreamFlix implements a <b>Tri-Tier Hybrid Recommendation Pipeline</b> "
        "that mathematically blends multiple recommendation methodologies.",
        body_style
    ))

    story.append(Paragraph("Tier 1: Implicit Matrix Factorization (ALS Algorithm)", h2_style))
    story.append(Paragraph(
        "We utilize <b>Alternating Least Squares (ALS)</b> with weighted implicit feedback (Hu, Koren, Volinsky formulation). "
        "Users rarely leave explicit 1-5 star ratings; instead, implicit signals (clicks, trailer plays, watch progress, bookmarks) indicate preference strength.",
        body_style
    ))

    # Weight Table
    weight_data = [
        [Paragraph("<b>User Interaction Event</b>", table_header_style), Paragraph("<b>Implicit Weight ($r_{ui}$)</b>", table_header_style), Paragraph("<b>Significance / Confidence Boost</b>", table_header_style)],
        [Paragraph("<code>rate</code> (Explicit 1-5 Star)", table_body_style), Paragraph("8.0 (Scaled with rating)", table_body_style), Paragraph("Strongest explicit preference indicator.", table_body_style)],
        [Paragraph("<code>like</code> / Thumbs Up", table_body_style), Paragraph("7.0", table_body_style), Paragraph("Direct positive sentiment confirmation.", table_body_style)],
        [Paragraph("<code>complete</code> (Watched 100%)", table_body_style), Paragraph("7.0", table_body_style), Paragraph("Full engagement with the title.", table_body_style)],
        [Paragraph("<code>watchlist</code> (Added to My List)", table_body_style), Paragraph("5.0", table_body_style), Paragraph("High intent to view in near future.", table_body_style)],
        [Paragraph("<code>watch_75</code> / <code>watch_90</code>", table_body_style), Paragraph("4.5", table_body_style), Paragraph("Substantial viewing completion.", table_body_style)],
        [Paragraph("<code>watch</code> / <code>watch_progress</code>", table_body_style), Paragraph("3.0", table_body_style), Paragraph("Active playback initiated.", table_body_style)],
        [Paragraph("<code>trailer_play</code>", table_body_style), Paragraph("2.5", table_body_style), Paragraph("High curiosity and exploration signal.", table_body_style)],
        [Paragraph("<code>click</code> / Detail View", table_body_style), Paragraph("2.0", table_body_style), Paragraph("Browsing interest.", table_body_style)],
        [Paragraph("<code>view</code> (Impression in Row)", table_body_style), Paragraph("1.0", table_body_style), Paragraph("Baseline passive exposure.", table_body_style)],
    ]
    weight_table = Table(weight_data, colWidths=[140, 110, 250])
    weight_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#374151")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(weight_table)

    story.append(Spacer(1, 6))
    story.append(Paragraph("ALS Training Formulation & Hyperparameters:", h3_style))
    story.append(Paragraph(
        "1. <b>User-Item Sparse Matrix:</b> Interaction scores are aggregated per <code>(user_id, item_id)</code> and structured as a Compressed Sparse Row (CSR) matrix of size <code>N_users × M_items</code>.<br/>"
        "2. <b>Latent Factor Dimensionality:</b> <code>factors = 64</code> to capture rich latent semantic genre/actor representations.<br/>"
        "3. <b>Regularization:</b> <code>regularization = 0.08</code> (L2 penalty) to prevent overfitting on sparse matrices.<br/>"
        "4. <b>Iterations:</b> <code>iterations = 25</code> with alternating updates: fix user factors and solve for item factors using ridge regression, then fix item factors and solve for user factors.<br/>"
        "5. <b>Prediction & Filtering:</b> User recommendation scores are computed via dot product <code>u_i · v_j</code> with <code>filter_already_liked_items=True</code>.",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Tier 2: Content-Based TF-IDF & Cosine Similarity", h2_style))
    story.append(Paragraph(
        "Every movie in the database is encoded into a multi-attribute term-frequency feature vector combining: "
        "<b>Genres</b> (weighted 2.0x), <b>Cast members</b> (weighted 1.5x), <b>Director</b> (weighted 1.5x), <b>Keywords/Tags</b> (weighted 1.0x), and <b>Release Decade</b> (weighted 0.5x). "
        "The similarity between item $A$ and item $B$ is calculated via Cosine Similarity:",
        body_style
    ))

    formula_box = [
        [Paragraph(
            "<font face='Courier' size=9>"
            "<b>Cosine Similarity:</b> Sim(A, B) = (A · B) / (||A|| × ||B||)<br/>"
            "<b>Hybrid Blended Score:</b><br/>"
            "FinalScore(u, i) = 0.45·ALS(u, i) + 0.35·ContentSim(u, i) + 0.10·Popularity(i) + 0.10·Rating(i)"
            "</font>",
            code_style
        )]
    ]
    formula_table = Table(formula_box, colWidths=[500])
    formula_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F3F4F6")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(formula_table)

    story.append(Spacer(1, 4))
    story.append(Paragraph("Tier 3: Diversity Ceilings & Cold-Start Prevention", h2_style))
    story.append(Paragraph(
        "To prevent recommendation monotony, a <b>Diversity Enforcement Filter</b> limits the maximum consecutive movies sharing identical primary genres to 2. "
        "For brand-new users without interactions, the system smoothly falls back to <b>Recency-Weighted Trending Titles</b> and <b>Top Rated blockbusters</b>.",
        body_style
    ))

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 5: DATABASE ARCHITECTURE & SCHEMA
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Database Architecture & Data Modeling", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    story.append(Paragraph(
        "StreamFlix uses <b>PostgreSQL 16</b> configured via <b>Drizzle ORM</b> with complete TypeScript schema definitions. "
        "The relational design enables fast indexed queries, foreign key referential integrity, and efficient aggregation of interaction streams.",
        body_style
    ))

    schema_data = [
        [Paragraph("<b>Table Name</b>", table_header_style), Paragraph("<b>Key Columns & Types</b>", table_header_style), Paragraph("<b>Role & Business Purpose</b>", table_header_style)],
        [
            Paragraph("<code>items</code>", table_body_style),
            Paragraph("id, tmdb_id (unique), title, tagline, overview, genres (JSON), tags (JSON), rating, vote_count, popularity, poster_url, backdrop_url, trailer_key, trailer_site, duration, director, cast (JSON), release_date, release_year", table_body_style),
            Paragraph("Primary movie catalog. Stores enriched TMDB metadata, artwork URLs, and YouTube trailer keys.", table_body_style)
        ],
        [
            Paragraph("<code>users</code>", table_body_style),
            Paragraph("id, email (unique), password_hash, is_admin, has_onboarded, created_at", table_body_style),
            Paragraph("User accounts, authentication credentials, and administrative role privileges.", table_body_style)
        ],
        [
            Paragraph("<code>watch_progress</code>", table_body_style),
            Paragraph("id, user_id (FK), item_id (FK), position_seconds, duration_seconds, percentage, completed, last_watched_at, updated_at", table_body_style),
            Paragraph("Netflix-style playback position sync. Powers the 'Continue Watching' row and watch progress bars.", table_body_style)
        ],
        [
            Paragraph("<code>interactions</code>", table_body_style),
            Paragraph("id, user_id (FK), item_id (FK), event_type (enum), rating (float), watch_duration, metadata (JSON), created_at", table_body_style),
            Paragraph("Event stream powering the ML model. Tracks all user engagements (rate, like, watch, click, trailer_play).", table_body_style)
        ],
        [
            Paragraph("<code>watchlist</code>", table_body_style),
            Paragraph("id, user_id (FK), item_id (FK), created_at", table_body_style),
            Paragraph("User bookmarking for personal library ('+ My List').", table_body_style)
        ],
        [
            Paragraph("<code>reviews</code>", table_body_style),
            Paragraph("id, user_id (FK), item_id (FK), rating, content, created_at", table_body_style),
            Paragraph("User community reviews and ratings per title.", table_body_style)
        ],
    ]

    schema_table = Table(schema_data, colWidths=[90, 210, 200])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1F2937")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(schema_table)

    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 6: EXTERNAL API INTEGRATIONS & TMDB PIPELINE
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. External API Integration (TMDB & YouTube)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    story.append(Paragraph(
        "StreamFlix integrates directly with <b>The Movie Database (TMDB) v3 REST API</b> to automate movie catalog ingestion and metadata enrichment.",
        body_style
    ))
    story.append(Paragraph("• <b>Configured API Key:</b> <code>16b6647c3bfcd660c7f4841c4e000b1a</code> (defined in <code>.env</code>)", bullet_style))
    story.append(Paragraph("• <b>TMDB Endpoints Ingested:</b> <code>/movie/popular</code>, <code>/trending/movie/week</code>, <code>/movie/top_rated</code>, <code>/movie/now_playing</code>, <code>/discover/movie</code>, and <code>/movie/{id}?append_to_response=credits,videos,keywords</code>.", bullet_style))
    story.append(Paragraph("• <b>Trailer Selection Algorithm:</b> TMDB returns trailers, teasers, featurettes, and behind-the-scenes videos. StreamFlix uses a deterministic hierarchical priority selector: "
                           "<code>YouTube Official Trailer > Any YouTube Trailer > YouTube Teaser</code> to guarantee high-fidelity playable trailers.", bullet_style))
    story.append(Paragraph("• <b>YouTube Embedded Iframe Integration:</b> Video playback uses <code>https://www.youtube-nocookie.com/embed/{trailerKey}?autoplay=1&rel=0</code> within a responsive 16:9 modal overlay.", bullet_style))
    story.append(Paragraph("• <b>Curated Offline Fallback Catalog:</b> A built-in bootstrap catalog of 20+ verified blockbuster titles ensures zero-downtime operation if rate limits or offline conditions occur.", bullet_style))

    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 7: AUTHENTICATION & LOGIN SYSTEM
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("7. Authentication, Security & Session Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    story.append(Paragraph(
        "StreamFlix implements a secure, stateless JWT (JSON Web Token) authentication architecture with role-based access control:",
        body_style
    ))
    story.append(Paragraph("1. <b>Password Hashing:</b> Passwords are encrypted using <code>bcryptjs</code> with 10 salt rounds before database persistence.", bullet_style))
    story.append(Paragraph("2. <b>Token Signing & Verification:</b> On valid credentials, a signed JWT payload <code>{ userId, exp: 7 days }</code> is generated with <code>HS256</code> encryption using <code>JWT_SECRET</code>.", bullet_style))
    story.append(Paragraph("3. <b>Middleware Guards:</b><br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;• <code>requireAuth</code>: Enforces valid Bearer tokens for private endpoints (Watchlist, Watch Progress, Review creation).<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;• <code>requireAdmin</code>: Checks <code>user.isAdmin === true</code> for TMDB catalog import and ML retraining triggers.<br/>"
                           "&nbsp;&nbsp;&nbsp;&nbsp;• <code>optionalAuth</code>: Gracefully detects logged-in users to provide personalized rows while allowing anonymous browsing.", bullet_style))
    story.append(Paragraph("4. <b>1-Click Demo Evaluation:</b> The modern login interface includes instant 1-click selectors for the default Admin (<code>admin@streamflix.com</code>) and Demo Viewer (<code>demo@streamflix.com</code>) accounts.", bullet_style))

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 8: HOW STREAMFLIX DIFFERS FROM OTHER SYSTEMS
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("8. Comparative Analysis: How StreamFlix Differs from Legacy Systems", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    diff_data = [
        [Paragraph("<b>Feature / Dimension</b>", table_header_style), Paragraph("<b>Traditional / Academic Systems</b>", table_header_style), Paragraph("<b>StreamFlix Production Platform</b>", table_header_style)],
        [
            Paragraph("<b>Architecture</b>", table_body_style),
            Paragraph("Monolithic script or standalone Jupyter Notebook (`.ipynb`).", table_body_style),
            Paragraph("<b>Multi-service Distributed Architecture:</b> React SPA + Express API Server + FastAPI ML Service + PostgreSQL.", table_body_style)
        ],
        [
            Paragraph("<b>Dataset & Media</b>", table_body_style),
            Paragraph("Static text CSV files (e.g. MovieLens 100k) with placeholder image URLs.", table_body_style),
            Paragraph("<b>Live TMDB Ingestion:</b> High-res artwork, actual movie synopses, cast/directors, and playable YouTube trailers.", table_body_style)
        ],
        [
            Paragraph("<b>Recommendation Logic</b>", table_body_style),
            Paragraph("Simple static SVD or purely explicit rating prediction.", table_body_style),
            Paragraph("<b>Dynamic Tri-Tier Hybrid Engine:</b> Weighted implicit ALS (64 factors) + TF-IDF cosine similarity + popularity velocity.", table_body_style)
        ],
        [
            Paragraph("<b>Playback & State</b>", table_body_style),
            Paragraph("No state management or playback tracking.", table_body_style),
            Paragraph("<b>Real-time Watch Progress Sync:</b> Tracks playback seconds, completion percentage, and powers Continue Watching rows.", table_body_style)
        ],
        [
            Paragraph("<b>User Interface</b>", table_body_style),
            Paragraph("Basic HTML tables or plain minimal UI with generic styling.", table_body_style),
            Paragraph("<b>Netflix-Grade Dark Theme:</b> Hero banners, video trailer modal, hover zoom cards, genre explorer, and live search.", table_body_style)
        ],
        [
            Paragraph("<b>Administration</b>", table_body_style),
            Paragraph("Manual command-line script execution.", table_body_style),
            Paragraph("<b>Admin Control Panel (`/admin`):</b> Live batch TMDB importer across categories, single-movie refresh, and ML retrain triggers.", table_body_style)
        ],
    ]

    diff_table = Table(diff_data, colWidths=[100, 180, 220])
    diff_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(diff_table)

    story.append(Spacer(1, 10))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 9: SUMMARY & LOCAL EXECUTION
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("9. Execution & Verification Summary", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    story.append(Paragraph(
        "StreamFlix is verified and running locally. The platform can be started using the workspace tooling:",
        body_style
    ))
    story.append(Paragraph("• <b>Start All Services:</b> <code>pnpm run dev</code> (Launches Web on port 5173, API on port 5001, and ML service on port 8000).", bullet_style))
    story.append(Paragraph("• <b>Seed & Sync Catalog:</b> <code>pnpm --filter @workspace/scripts run seed</code> (Inserts blockbuster titles & demo accounts).", bullet_style))
    story.append(Paragraph("• <b>Typecheck & Build:</b> <code>pnpm run build</code> (Validates TypeScript across all workspace packages and produces production bundles).", bullet_style))
    story.append(Paragraph("• <b>GitHub Repository:</b> <code>https://github.com/alishabhalla09/Movie_Recommendation_System</code>", bullet_style))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated documentation PDF at: {filename}")

if __name__ == "__main__":
    output_path = sys.argv[1] if len(sys.argv) > 1 else "StreamFlix_Full_Project_Documentation.pdf"
    create_documentation_pdf(output_path)
