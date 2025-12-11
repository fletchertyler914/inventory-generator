#!/usr/bin/env python3
"""
Generate comprehensive mock divorce case demo data.
Creates realistic files with proper content for testing all viewer types.
"""

import os
import sys
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import random
from faker import Faker
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from PIL import Image, ImageDraw, ImageFont
import csv
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from pptx import Presentation
from pptx.util import Inches as PptInches
import json

# Initialize Faker
fake = Faker()
Faker.seed(42)  # For reproducible results
random.seed(42)

# Base directory
BASE_DIR = Path(__file__).parent.parent
CASE_DIR = BASE_DIR / "demo-cases" / "divorce-case-2024"

# Case metadata (consistent across files)
CASE_NUMBER = "2024-DV-01234"
PLAINTIFF_NAME = fake.name()
DEFENDANT_NAME = fake.name()
PLAINTIFF_LAWYER = fake.name()
DEFENDANT_LAWYER = fake.name()
JUDGE_NAME = fake.name()
COURT_NAME = f"{fake.city()} Family Court"
MARRIAGE_DATE = datetime(2018, 6, 15)
FILING_DATE = datetime(2024, 1, 15)

# Financial data
BANK_NAME = fake.company()
ACCOUNT_NUMBER = f"****{random.randint(1000, 9999)}"
ROUTING_NUMBER = f"{random.randint(100000000, 999999999)}"


def create_directory_structure():
    """Create the complete directory structure."""
    directories = [
        "01-legal-documents/court-orders",
        "02-financial-records/bank-statements",
        "02-financial-records/tax-documents",
        "03-communications/text-messages",
        "04-photos-evidence/property-photos",
        "04-photos-evidence/vehicle-photos",
        "04-photos-evidence/personal-items",
        "05-medical-records",
        "06-business-records/quarterly-reports",
        "07-unrelated-documents/grocery-receipts",
        "07-unrelated-documents/old-vacation-photos",
        "08-duplicates/backup",
        "08-duplicates/archive",
        "09-miscellaneous/code-samples",
        "09-miscellaneous/audio-recordings",
        "09-miscellaneous/video-evidence",
    ]

    for dir_path in directories:
        (CASE_DIR / dir_path).mkdir(parents=True, exist_ok=True)

    print(f"Created directory structure in {CASE_DIR}")


def generate_pdf_legal_document(filename, title, content_lines):
    """Generate a PDF legal document."""
    filepath = CASE_DIR / filename
    doc = SimpleDocTemplate(str(filepath), pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=colors.HexColor("#000000"),
        spaceAfter=12,
        alignment=TA_CENTER,
    )

    header_style = ParagraphStyle(
        "Header",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#666666"),
        alignment=TA_CENTER,
    )

    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"], fontSize=11, spaceAfter=12, alignment=TA_LEFT
    )

    # Header
    story.append(Paragraph(COURT_NAME, header_style))
    story.append(Paragraph(f"Case No. {CASE_NUMBER}", header_style))
    story.append(Spacer(1, 0.2 * inch))

    # Title
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.3 * inch))

    # Content
    for line in content_lines:
        story.append(Paragraph(line, body_style))

    # Footer
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(f"Filed: {FILING_DATE.strftime('%B %d, %Y')}", header_style))
    story.append(Paragraph(f"Judge: {JUDGE_NAME}", header_style))

    doc.build(story)
    return filepath


def generate_pdf_financial_statement(filename, transactions):
    """Generate a PDF bank statement."""
    filepath = CASE_DIR / filename
    doc = SimpleDocTemplate(str(filepath), pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Header
    header_style = ParagraphStyle(
        "Header",
        parent=styles["Normal"],
        fontSize=14,
        textColor=colors.HexColor("#000000"),
        spaceAfter=6,
        alignment=TA_LEFT,
    )

    story.append(Paragraph(BANK_NAME, header_style))
    story.append(Paragraph(f"Account Number: {ACCOUNT_NUMBER}", styles["Normal"]))
    story.append(Paragraph(f"Routing Number: {ROUTING_NUMBER}", styles["Normal"]))
    story.append(Spacer(1, 0.3 * inch))

    # Statement period
    period_start = datetime(2024, 1, 1)
    period_end = datetime(2024, 1, 31)
    story.append(
        Paragraph(
            f"Statement Period: {period_start.strftime('%B %d, %Y')} - {period_end.strftime('%B %d, %Y')}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.2 * inch))

    # Transactions table
    table_data = [["Date", "Description", "Amount", "Balance"]]
    balance = 50000.00

    for trans in transactions:
        date_str = trans["date"].strftime("%m/%d/%Y")
        desc = trans["description"]
        amount = trans["amount"]
        balance += amount
        amount_str = f"${amount:,.2f}" if amount >= 0 else f"(${abs(amount):,.2f})"
        balance_str = f"${balance:,.2f}"
        table_data.append([date_str, desc, amount_str, balance_str])

    table = Table(table_data, colWidths=[1 * inch, 3 * inch, 1.2 * inch, 1.2 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
            ]
        )
    )

    story.append(table)
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(f"Ending Balance: ${balance:,.2f}", styles["Normal"]))

    doc.build(story)
    return filepath


def generate_csv_bank_statement(filename, transactions):
    """Generate a CSV bank statement."""
    filepath = CASE_DIR / filename
    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Description", "Amount", "Balance"])
        balance = 50000.00
        for trans in transactions:
            balance += trans["amount"]
            writer.writerow(
                [
                    trans["date"].strftime("%Y-%m-%d"),
                    trans["description"],
                    f"{trans['amount']:.2f}",
                    f"{balance:.2f}",
                ]
            )
    return filepath


def generate_csv_phone_log(filename, calls):
    """Generate a CSV phone call log."""
    filepath = CASE_DIR / filename
    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Time", "Duration (min)", "Phone Number", "Type"])
        for call in calls:
            writer.writerow(
                [
                    call["date"].strftime("%Y-%m-%d"),
                    call["time"],
                    call["duration"],
                    call["phone"],
                    call["type"],
                ]
            )
    return filepath


def generate_csv_medical_bills(filename, bills):
    """Generate a CSV medical bills file."""
    filepath = CASE_DIR / filename
    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Provider", "Service", "Amount", "Status"])
        for bill in bills:
            writer.writerow(
                [
                    bill["date"].strftime("%Y-%m-%d"),
                    bill["provider"],
                    bill["service"],
                    f"{bill['amount']:.2f}",
                    bill["status"],
                ]
            )
    return filepath


def generate_excel_asset_inventory(filename):
    """Generate an Excel asset inventory with multiple sheets."""
    filepath = CASE_DIR / filename
    wb = Workbook()

    # Remove default sheet
    wb.remove(wb.active)

    # Real Estate sheet
    ws_real_estate = wb.create_sheet("Real Estate")
    ws_real_estate.append(
        [
            "Property Address",
            "Purchase Date",
            "Purchase Price",
            "Current Value",
            "Mortgage Balance",
            "Equity",
        ]
    )
    properties = [
        [fake.address(), "2018-06-15", "$450,000", "$520,000", "$380,000", "$140,000"],
        [fake.address(), "2020-03-20", "$280,000", "$310,000", "$250,000", "$60,000"],
    ]
    for prop in properties:
        ws_real_estate.append(prop)

    # Vehicles sheet
    ws_vehicles = wb.create_sheet("Vehicles")
    ws_vehicles.append(
        [
            "Vehicle",
            "Year",
            "Make",
            "Model",
            "Purchase Date",
            "Purchase Price",
            "Current Value",
        ]
    )
    vehicles = [
        [
            "Primary Vehicle",
            "2020",
            "Toyota",
            "Camry",
            "2020-05-10",
            "$28,000",
            "$18,000",
        ],
        ["Motorcycle", "2018", "Honda", "CBR600", "2018-08-22", "$12,000", "$8,500"],
    ]
    for vehicle in vehicles:
        ws_vehicles.append(vehicle)

    # Investments sheet
    ws_investments = wb.create_sheet("Investments")
    ws_investments.append(
        ["Account Type", "Institution", "Account Number", "Current Value"]
    )
    investments = [
        ["401(k)", fake.company(), f"****{random.randint(1000, 9999)}", "$125,000"],
        ["IRA", fake.company(), f"****{random.randint(1000, 9999)}", "$45,000"],
        ["Brokerage", fake.company(), f"****{random.randint(1000, 9999)}", "$78,000"],
    ]
    for inv in investments:
        ws_investments.append(inv)

    # Style headers
    header_fill = PatternFill(
        start_color="366092", end_color="366092", fill_type="solid"
    )
    header_font = Font(bold=True, color="FFFFFF")

    for ws in wb.worksheets:
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

    wb.save(filepath)
    return filepath


def generate_text_email_export(filename, emails):
    """Generate a text email export file."""
    filepath = CASE_DIR / filename
    with open(filepath, "w") as f:
        for email in emails:
            f.write(f"From: {email['from']}\n")
            f.write(f"To: {email['to']}\n")
            f.write(f"Date: {email['date'].strftime('%a, %d %b %Y %H:%M:%S %z')}\n")
            f.write(f"Subject: {email['subject']}\n")
            f.write("\n")
            f.write(f"{email['body']}\n")
            f.write("\n" + "=" * 80 + "\n\n")
    return filepath


def generate_text_messages(filename, messages):
    """Generate a text message transcript."""
    filepath = CASE_DIR / filename
    with open(filepath, "w") as f:
        for msg in messages:
            f.write(
                f"[{msg['date'].strftime('%Y-%m-%d %H:%M:%S')}] {msg['sender']}: {msg['text']}\n"
            )
    return filepath


def generate_image(filename, width=800, height=600, text=None):
    """Generate a simple image file."""
    filepath = CASE_DIR / filename
    img = Image.new("RGB", (width, height), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)

    # Draw a simple border
    draw.rectangle([10, 10, width - 10, height - 10], outline=(200, 200, 200), width=3)

    # Add text if provided
    if text:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
        except:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        position = ((width - text_width) // 2, (height - text_height) // 2)
        draw.text(position, text, fill=(100, 100, 100), font=font)

    # Add some random colored rectangles for visual interest
    for _ in range(5):
        x1 = random.randint(50, width - 150)
        y1 = random.randint(50, height - 150)
        x2 = x1 + random.randint(50, 150)
        y2 = y1 + random.randint(50, 150)
        color = (
            random.randint(100, 255),
            random.randint(100, 255),
            random.randint(100, 255),
        )
        draw.rectangle([x1, y1, x2, y2], fill=color, outline=(50, 50, 50))

    img.save(filepath, "JPEG", quality=85)
    return filepath


def generate_word_document(filename, title, paragraphs):
    """Generate a Word document."""
    filepath = CASE_DIR / filename
    doc = Document()

    # Title
    title_para = doc.add_heading(title, 0)
    title_para.alignment = 1  # Center alignment

    # Content
    for para_text in paragraphs:
        doc.add_paragraph(para_text)

    doc.save(filepath)
    return filepath


def generate_powerpoint(filename, slides_data):
    """Generate a PowerPoint presentation."""
    filepath = CASE_DIR / filename
    prs = Presentation()
    prs.slide_width = PptInches(10)
    prs.slide_height = PptInches(7.5)

    for slide_data in slides_data:
        slide = prs.slides.add_slide(prs.slide_layouts[0])
        title = slide.shapes.title
        content = slide.placeholders[1]

        title.text = slide_data["title"]
        content.text = slide_data["content"]

    prs.save(filepath)
    return filepath


def generate_code_file(filename, content):
    """Generate a code file."""
    filepath = CASE_DIR / filename
    with open(filepath, "w") as f:
        f.write(content)
    return filepath


def generate_json_file(filename, data):
    """Generate a JSON file."""
    filepath = CASE_DIR / filename
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    return filepath


def set_file_timestamp(filepath, date):
    """Set file modification timestamp."""
    timestamp = date.timestamp()
    os.utime(filepath, (timestamp, timestamp))


def generate_all_files():
    """Generate all files for the demo case."""
    print("Generating files...")

    # 1. Legal Documents
    print("  Generating legal documents...")

    # Petition for Divorce
    petition_content = [
        f"<b>PETITION FOR DISSOLUTION OF MARRIAGE</b>",
        f"",
        f"Petitioner: {PLAINTIFF_NAME}",
        f"Respondent: {DEFENDANT_NAME}",
        f"",
        f"The Petitioner, {PLAINTIFF_NAME}, respectfully petitions this Court for a dissolution of marriage.",
        f"",
        f"<b>GROUNDS FOR DIVORCE</b>",
        f"The parties were married on {MARRIAGE_DATE.strftime('%B %d, %Y')} in {fake.city()}, {fake.state()}.",
        f"The parties have been separated since {FILING_DATE.strftime('%B %d, %Y')}.",
        f"",
        f"<b>RELIEF REQUESTED</b>",
        f"1. Dissolution of the marriage",
        f"2. Division of marital property",
        f"3. Child custody and support arrangements",
        f"4. Spousal support",
    ]
    petition_path = generate_pdf_legal_document(
        "01-legal-documents/petition-for-divorce.pdf",
        "PETITION FOR DISSOLUTION OF MARRIAGE",
        petition_content,
    )
    set_file_timestamp(petition_path, FILING_DATE)

    # Marriage Certificate
    cert_content = [
        f"<b>MARRIAGE CERTIFICATE</b>",
        f"",
        f"This certifies that {PLAINTIFF_NAME} and {DEFENDANT_NAME}",
        f"were united in marriage on {MARRIAGE_DATE.strftime('%B %d, %Y')}",
        f"in {fake.city()}, {fake.state()}.",
        f"",
        f"Officiant: {fake.name()}",
        f"Witness 1: {fake.name()}",
        f"Witness 2: {fake.name()}",
    ]
    cert_path = generate_pdf_legal_document(
        "01-legal-documents/marriage-certificate.pdf",
        "CERTIFICATE OF MARRIAGE",
        cert_content,
    )
    set_file_timestamp(cert_path, MARRIAGE_DATE)

    # Prenuptial Agreement
    prenup_content = [
        f"<b>PRENUPTIAL AGREEMENT</b>",
        f"",
        f"This agreement is entered into between {PLAINTIFF_NAME} and {DEFENDANT_NAME}",
        f"on {MARRIAGE_DATE.strftime('%B %d, %Y')}.",
        f"",
        f"<b>PROPERTY RIGHTS</b>",
        f"Each party shall retain separate ownership of property acquired before marriage.",
        f"Property acquired during marriage shall be considered marital property.",
        f"",
        f"<b>SPOUSAL SUPPORT</b>",
        f"In the event of divorce, neither party shall be entitled to spousal support.",
    ]
    prenup_path = generate_pdf_legal_document(
        "01-legal-documents/prenuptial-agreement.pdf",
        "PRENUPTIAL AGREEMENT",
        prenup_content,
    )
    set_file_timestamp(prenup_path, MARRIAGE_DATE)

    # Court Orders
    temp_orders_content = [
        f"<b>TEMPORARY ORDERS</b>",
        f"",
        f"Case No. {CASE_NUMBER}",
        f"",
        f"IT IS HEREBY ORDERED:",
        f"1. Temporary custody of minor children is granted to {PLAINTIFF_NAME}.",
        f"2. {DEFENDANT_NAME} shall pay temporary child support in the amount of $2,500 per month.",
        f"3. Both parties are restrained from disposing of marital assets.",
        f"",
        f"Dated: March 15, 2024",
        f"Judge: {JUDGE_NAME}",
    ]
    temp_orders_path = generate_pdf_legal_document(
        "01-legal-documents/court-orders/temporary-orders-2024-03-15.pdf",
        "TEMPORARY ORDERS",
        temp_orders_content,
    )
    set_file_timestamp(temp_orders_path, datetime(2024, 3, 15))

    custody_notice_content = [
        f"<b>NOTICE OF CUSTODY HEARING</b>",
        f"",
        f"Case No. {CASE_NUMBER}",
        f"",
        f"NOTICE IS HEREBY GIVEN that a custody hearing has been scheduled",
        f"for April 20, 2024 at 9:00 AM in {COURT_NAME}.",
        f"",
        f"All parties are required to appear.",
    ]
    custody_path = generate_pdf_legal_document(
        "01-legal-documents/court-orders/custody-hearing-notice.pdf",
        "NOTICE OF CUSTODY HEARING",
        custody_notice_content,
    )
    set_file_timestamp(custody_path, datetime(2024, 3, 20))

    # 2. Financial Records
    print("  Generating financial records...")

    # Bank statements (PDF)
    jan_transactions = [
        {
            "date": datetime(2024, 1, 5),
            "description": "Payroll Deposit",
            "amount": 5000.00,
        },
        {
            "date": datetime(2024, 1, 8),
            "description": "Mortgage Payment",
            "amount": -2500.00,
        },
        {
            "date": datetime(2024, 1, 12),
            "description": "Grocery Store",
            "amount": -150.00,
        },
        {
            "date": datetime(2024, 1, 15),
            "description": "Utility Bill",
            "amount": -200.00,
        },
        {
            "date": datetime(2024, 1, 20),
            "description": "ATM Withdrawal",
            "amount": -300.00,
        },
        {"date": datetime(2024, 1, 25), "description": "Restaurant", "amount": -85.00},
    ]
    generate_pdf_financial_statement(
        "02-financial-records/bank-statements/checking-account-2024-01.pdf",
        jan_transactions,
    )

    feb_transactions = [
        {
            "date": datetime(2024, 2, 5),
            "description": "Payroll Deposit",
            "amount": 5000.00,
        },
        {
            "date": datetime(2024, 2, 8),
            "description": "Mortgage Payment",
            "amount": -2500.00,
        },
        {
            "date": datetime(2024, 2, 10),
            "description": "Legal Fees",
            "amount": -5000.00,
        },
        {
            "date": datetime(2024, 2, 15),
            "description": "Car Payment",
            "amount": -450.00,
        },
        {
            "date": datetime(2024, 2, 20),
            "description": "Insurance Premium",
            "amount": -350.00,
        },
    ]
    generate_pdf_financial_statement(
        "02-financial-records/bank-statements/checking-account-2024-02.pdf",
        feb_transactions,
    )

    savings_transactions = [
        {
            "date": datetime(2024, 1, 1),
            "description": "Opening Balance",
            "amount": 25000.00,
        },
        {
            "date": datetime(2024, 1, 15),
            "description": "Transfer from Checking",
            "amount": 2000.00,
        },
        {
            "date": datetime(2024, 1, 20),
            "description": "Interest Payment",
            "amount": 45.00,
        },
    ]
    generate_pdf_financial_statement(
        "02-financial-records/bank-statements/savings-account-2024-01.pdf",
        savings_transactions,
    )

    # CSV bank statement
    generate_csv_bank_statement(
        "02-financial-records/bank-statements/joint-account-statement.csv",
        jan_transactions + feb_transactions,
    )

    # Tax documents
    tax_2023_content = [
        f"<b>JOINT TAX RETURN - 2023</b>",
        f"",
        f"Taxpayers: {PLAINTIFF_NAME} and {DEFENDANT_NAME}",
        f"Filing Status: Married Filing Jointly",
        f"",
        f"<b>INCOME</b>",
        f"Wages: $120,000",
        f"Interest Income: $2,500",
        f"Dividend Income: $1,200",
        f"Total Income: $123,700",
        f"",
        f"<b>DEDUCTIONS</b>",
        f"Standard Deduction: $27,700",
        f"Taxable Income: $96,000",
        f"",
        f"<b>TAX</b>",
        f"Federal Tax: $12,500",
        f"State Tax: $3,200",
        f"Total Tax: $15,700",
    ]
    tax_2023_path = generate_pdf_legal_document(
        "02-financial-records/tax-documents/2023-joint-tax-return.pdf",
        "2023 TAX RETURN",
        tax_2023_content,
    )
    set_file_timestamp(tax_2023_path, datetime(2024, 4, 15))

    tax_2022_content = [
        f"<b>JOINT TAX RETURN - 2022</b>",
        f"",
        f"Taxpayers: {PLAINTIFF_NAME} and {DEFENDANT_NAME}",
        f"Filing Status: Married Filing Jointly",
        f"",
        f"<b>INCOME</b>",
        f"Wages: $115,000",
        f"Interest Income: $2,000",
        f"Total Income: $117,000",
        f"",
        f"<b>TAX</b>",
        f"Federal Tax: $11,800",
        f"State Tax: $3,000",
        f"Total Tax: $14,800",
    ]
    tax_2022_path = generate_pdf_legal_document(
        "02-financial-records/tax-documents/2022-tax-return.pdf",
        "2022 TAX RETURN",
        tax_2022_content,
    )
    set_file_timestamp(tax_2022_path, datetime(2023, 4, 15))

    # Asset inventory Excel
    generate_excel_asset_inventory("02-financial-records/asset-inventory.xlsx")

    # Income verification
    income_content = [
        f"<b>INCOME VERIFICATION LETTER</b>",
        f"",
        f"To Whom It May Concern:",
        f"",
        f"This letter verifies that {PLAINTIFF_NAME} has been employed",
        f"with {fake.company()} since {datetime(2020, 3, 1).strftime('%B %d, %Y')}.",
        f"",
        f"Current annual salary: $75,000",
        f"Current position: {fake.job()}",
        f"",
        f"Sincerely,",
        f"{fake.name()}",
        f"Human Resources Manager",
    ]
    income_path = generate_pdf_legal_document(
        "02-financial-records/income-verification.pdf",
        "INCOME VERIFICATION",
        income_content,
    )
    set_file_timestamp(income_path, datetime(2024, 2, 1))

    # 3. Communications
    print("  Generating communications...")

    # Email export
    emails = [
        {
            "from": PLAINTIFF_LAWYER,
            "to": PLAINTIFF_NAME,
            "date": datetime(2024, 1, 20, 10, 30),
            "subject": "Re: Divorce Proceedings",
            "body": f"Dear {PLAINTIFF_NAME.split()[0]},\n\nI have reviewed your case and we should proceed with filing the petition. Please review the attached documents and let me know if you have any questions.\n\nBest regards,\n{PLAINTIFF_LAWYER}",
        },
        {
            "from": DEFENDANT_NAME,
            "to": PLAINTIFF_NAME,
            "date": datetime(2024, 1, 25, 14, 15),
            "subject": "Re: Property Division",
            "body": f"I received your proposal regarding the property division. I need to discuss this with my attorney before responding.\n\n{DEFENDANT_NAME.split()[0]}",
        },
        {
            "from": PLAINTIFF_NAME,
            "to": DEFENDANT_NAME,
            "date": datetime(2024, 2, 5, 9, 0),
            "subject": "Child Custody Arrangements",
            "body": f"I would like to propose a shared custody arrangement. Let's discuss this at our next meeting.\n\n{PLAINTIFF_NAME.split()[0]}",
        },
    ]
    generate_text_email_export("03-communications/email-export-2024.txt", emails)

    # Text messages
    messages_jan = [
        {
            "date": datetime(2024, 1, 10, 8, 30),
            "sender": PLAINTIFF_NAME.split()[0],
            "text": "Can we talk about the kids this weekend?",
        },
        {
            "date": datetime(2024, 1, 10, 9, 15),
            "sender": DEFENDANT_NAME.split()[0],
            "text": "Yes, I can pick them up Friday evening.",
        },
        {
            "date": datetime(2024, 1, 10, 9, 20),
            "sender": PLAINTIFF_NAME.split()[0],
            "text": "That works. Please have them back Sunday by 6pm.",
        },
        {
            "date": datetime(2024, 1, 10, 9, 25),
            "sender": DEFENDANT_NAME.split()[0],
            "text": "Will do.",
        },
    ]
    generate_text_messages(
        "03-communications/text-messages/messages-2024-01.txt", messages_jan
    )

    messages_feb = [
        {
            "date": datetime(2024, 2, 3, 10, 0),
            "sender": PLAINTIFF_NAME.split()[0],
            "text": "Did you receive the financial disclosure documents?",
        },
        {
            "date": datetime(2024, 2, 3, 14, 30),
            "sender": DEFENDANT_NAME.split()[0],
            "text": "Yes, my attorney is reviewing them.",
        },
        {
            "date": datetime(2024, 2, 5, 11, 0),
            "sender": PLAINTIFF_NAME.split()[0],
            "text": "Let me know when you have questions.",
        },
    ]
    generate_text_messages(
        "03-communications/text-messages/messages-2024-02.txt", messages_feb
    )

    # Phone call log
    calls = [
        {
            "date": datetime(2024, 1, 15),
            "time": "10:30 AM",
            "duration": 25,
            "phone": fake.phone_number(),
            "type": "Outgoing",
        },
        {
            "date": datetime(2024, 1, 18),
            "time": "2:15 PM",
            "duration": 12,
            "phone": fake.phone_number(),
            "type": "Incoming",
        },
        {
            "date": datetime(2024, 1, 22),
            "time": "9:00 AM",
            "duration": 45,
            "phone": fake.phone_number(),
            "type": "Outgoing",
        },
        {
            "date": datetime(2024, 2, 1),
            "time": "3:30 PM",
            "duration": 18,
            "phone": fake.phone_number(),
            "type": "Incoming",
        },
        {
            "date": datetime(2024, 2, 8),
            "time": "11:00 AM",
            "duration": 30,
            "phone": fake.phone_number(),
            "type": "Outgoing",
        },
    ]
    generate_csv_phone_log("03-communications/phone-call-log.csv", calls)

    # 4. Photos/Evidence
    print("  Generating photos...")
    generate_image(
        "04-photos-evidence/property-photos/house-exterior.jpg",
        1200,
        800,
        "House Exterior",
    )
    generate_image(
        "04-photos-evidence/property-photos/house-interior-1.jpg",
        1200,
        800,
        "Living Room",
    )
    generate_image(
        "04-photos-evidence/property-photos/house-interior-2.jpg", 1200, 800, "Kitchen"
    )
    generate_image(
        "04-photos-evidence/vehicle-photos/car-2020-toyota.jpg",
        1000,
        750,
        "2020 Toyota Camry",
    )
    generate_image(
        "04-photos-evidence/vehicle-photos/motorcycle-2018-honda.jpg",
        1000,
        750,
        "2018 Honda CBR600",
    )
    generate_image(
        "04-photos-evidence/personal-items/jewelry-collection.jpg",
        800,
        600,
        "Jewelry Collection",
    )

    # 5. Medical Records
    print("  Generating medical records...")
    therapy_content = [
        f"<b>THERAPY NOTES - 2023</b>",
        f"",
        f"Patient: {PLAINTIFF_NAME}",
        f"Therapist: {fake.name()}",
        f"",
        f"Session Date: {datetime(2023, 6, 10).strftime('%B %d, %Y')}",
        f"",
        f"Patient discussed ongoing marital difficulties and stress related to",
        f"work and family responsibilities. Explored coping strategies and",
        f"communication techniques.",
    ]
    therapy_path = generate_pdf_legal_document(
        "05-medical-records/therapy-notes-2023.pdf", "THERAPY NOTES", therapy_content
    )
    set_file_timestamp(therapy_path, datetime(2023, 6, 10))

    medical_bills = [
        {
            "date": datetime(2024, 1, 5),
            "provider": fake.company(),
            "service": "Physical Therapy",
            "amount": 150.00,
            "status": "Paid",
        },
        {
            "date": datetime(2024, 1, 15),
            "provider": fake.company(),
            "service": "Doctor Visit",
            "amount": 200.00,
            "status": "Pending",
        },
        {
            "date": datetime(2024, 2, 1),
            "provider": fake.company(),
            "service": "Lab Work",
            "amount": 125.00,
            "status": "Paid",
        },
    ]
    generate_csv_medical_bills(
        "05-medical-records/medical-bills-2024.csv", medical_bills
    )

    # 6. Business Records
    print("  Generating business records...")
    business_license_content = [
        f"<b>BUSINESS LICENSE</b>",
        f"",
        f"Business Name: {fake.company()}",
        f"Owner: {DEFENDANT_NAME}",
        f"License Number: {random.randint(100000, 999999)}",
        f"Issue Date: {datetime(2021, 5, 1).strftime('%B %d, %Y')}",
        f"Expiration Date: {datetime(2025, 5, 1).strftime('%B %d, %Y')}",
        f"Business Type: {fake.catch_phrase()}",
    ]
    license_path = generate_pdf_legal_document(
        "06-business-records/business-license.pdf",
        "BUSINESS LICENSE",
        business_license_content,
    )
    set_file_timestamp(license_path, datetime(2021, 5, 1))

    q1_report_content = [
        f"<b>QUARTERLY BUSINESS REPORT - Q1 2024</b>",
        f"",
        f"Revenue: $45,000",
        f"Expenses: $28,000",
        f"Net Profit: $17,000",
        f"",
        f"Key highlights:",
        f"- Increased client base by 15%",
        f"- Launched new service offerings",
        f"- Improved operational efficiency",
    ]
    q1_path = generate_pdf_legal_document(
        "06-business-records/quarterly-reports/Q1-2024-report.pdf",
        "Q1 2024 REPORT",
        q1_report_content,
    )
    set_file_timestamp(q1_path, datetime(2024, 4, 1))

    q2_report_content = [
        f"<b>QUARTERLY BUSINESS REPORT - Q2 2024</b>",
        f"",
        f"Revenue: $52,000",
        f"Expenses: $30,000",
        f"Net Profit: $22,000",
        f"",
        f"Key highlights:",
        f"- Continued growth in client base",
        f"- Expanded marketing efforts",
        f"- Positive cash flow maintained",
    ]
    q2_path = generate_pdf_legal_document(
        "06-business-records/quarterly-reports/Q2-2024-report.pdf",
        "Q2 2024 REPORT",
        q2_report_content,
    )
    set_file_timestamp(q2_path, datetime(2024, 7, 1))

    payroll_data = [
        {
            "date": datetime(2024, 1, 15),
            "employee": fake.name(),
            "hours": 40,
            "rate": 25.00,
            "gross": 1000.00,
        },
        {
            "date": datetime(2024, 1, 15),
            "employee": fake.name(),
            "hours": 35,
            "rate": 30.00,
            "gross": 1050.00,
        },
        {
            "date": datetime(2024, 2, 15),
            "employee": fake.name(),
            "hours": 40,
            "rate": 25.00,
            "gross": 1000.00,
        },
        {
            "date": datetime(2024, 2, 15),
            "employee": fake.name(),
            "hours": 35,
            "rate": 30.00,
            "gross": 1050.00,
        },
    ]
    payroll_path = CASE_DIR / "06-business-records/employee-payroll.csv"
    with open(payroll_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Employee", "Hours", "Rate", "Gross Pay"])
        for row in payroll_data:
            writer.writerow(
                [
                    row["date"].strftime("%Y-%m-%d"),
                    row["employee"],
                    row["hours"],
                    f"{row['rate']:.2f}",
                    f"{row['gross']:.2f}",
                ]
            )

    # 7. Unrelated Documents
    print("  Generating unrelated documents...")
    receipt_content = [
        f"<b>GROCERY RECEIPT</b>",
        f"",
        f"Store: {fake.company()}",
        f"Date: {datetime(2024, 1, 15).strftime('%B %d, %Y')}",
        f"",
        f"Items:",
        f"- Milk: $4.99",
        f"- Bread: $3.49",
        f"- Eggs: $5.99",
        f"- Total: $14.47",
    ]
    receipt1_path = generate_pdf_legal_document(
        "07-unrelated-documents/grocery-receipts/receipt-2024-01-15.pdf",
        "RECEIPT",
        receipt_content,
    )
    set_file_timestamp(receipt1_path, datetime(2024, 1, 15))

    receipt2_content = [
        f"<b>GROCERY RECEIPT</b>",
        f"",
        f"Store: {fake.company()}",
        f"Date: {datetime(2024, 2, 20).strftime('%B %d, %Y')}",
        f"",
        f"Items:",
        f"- Chicken: $12.99",
        f"- Vegetables: $8.50",
        f"- Total: $21.49",
    ]
    receipt2_path = generate_pdf_legal_document(
        "07-unrelated-documents/grocery-receipts/receipt-2024-02-20.pdf",
        "RECEIPT",
        receipt2_content,
    )
    set_file_timestamp(receipt2_path, datetime(2024, 2, 20))

    random_notes = f"""Random Notes
{datetime(2024, 1, 10).strftime('%Y-%m-%d')}

- Need to call plumber about leaky faucet
- Kids have soccer practice on Saturday
- Remember to pick up dry cleaning
- Birthday party next weekend

{datetime(2024, 2, 5).strftime('%Y-%m-%d')}

- Doctor appointment on Tuesday
- Car needs oil change
- Buy groceries for the week
"""
    notes_path = CASE_DIR / "07-unrelated-documents/random-notes.txt"
    with open(notes_path, "w") as f:
        f.write(random_notes)
    set_file_timestamp(notes_path, datetime(2024, 2, 5))

    generate_image(
        "07-unrelated-documents/old-vacation-photos/beach-2022.jpg",
        1000,
        750,
        "Beach Vacation 2022",
    )
    generate_image(
        "07-unrelated-documents/old-vacation-photos/mountains-2021.jpg",
        1000,
        750,
        "Mountain Trip 2021",
    )

    # 8. Duplicates (copy files from other locations)
    print("  Creating duplicate files...")

    # Copy petition
    shutil.copy(
        CASE_DIR / "01-legal-documents/petition-for-divorce.pdf",
        CASE_DIR / "08-duplicates/copy-of-petition.pdf",
    )

    # Copy bank statement
    shutil.copy(
        CASE_DIR / "02-financial-records/bank-statements/checking-account-2024-01.pdf",
        CASE_DIR / "08-duplicates/backup/checking-account-2024-01.pdf",
    )

    # Copy asset inventory
    shutil.copy(
        CASE_DIR / "02-financial-records/asset-inventory.xlsx",
        CASE_DIR / "08-duplicates/backup/asset-inventory.xlsx",
    )

    # Copy marriage certificate
    shutil.copy(
        CASE_DIR / "01-legal-documents/marriage-certificate.pdf",
        CASE_DIR / "08-duplicates/archive/marriage-certificate.pdf",
    )

    # 9. Miscellaneous
    print("  Generating miscellaneous files...")

    # Code files
    python_code = """#!/usr/bin/env python3
# Old script for processing data
# Created: 2023-05-15

import json
import csv

def process_data(input_file, output_file):
    \"\"\"Process data from input to output.\"\"\"
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    # Process data here
    processed = []
    for item in data:
        processed.append(item)
    
    with open(output_file, 'w') as f:
        json.dump(processed, f, indent=2)

if __name__ == '__main__':
    process_data('input.json', 'output.json')
"""
    generate_code_file("09-miscellaneous/code-samples/old-script.py", python_code)

    config_data = {
        "app_name": "DataProcessor",
        "version": "1.0.0",
        "settings": {"debug": False, "log_level": "info", "output_dir": "./output"},
    }
    generate_json_file("09-miscellaneous/code-samples/config.json", config_data)

    # Audio file (minimal MP3 header - just enough to be recognized)
    # Creating a very small valid MP3 file
    mp3_path = CASE_DIR / "09-miscellaneous/audio-recordings/meeting-notes-2024-01.mp3"
    # MP3 header bytes (minimal valid MP3)
    mp3_header = bytes(
        [
            0xFF,
            0xFB,
            0x90,
            0x00,  # MP3 sync word and header
        ]
        + [0x00] * 100
    )  # Minimal data
    with open(mp3_path, "wb") as f:
        f.write(mp3_header)
    set_file_timestamp(mp3_path, datetime(2024, 1, 15))

    # Video file (minimal MOV header)
    mov_path = CASE_DIR / "09-miscellaneous/video-evidence/security-footage-2024-03.mov"
    # Minimal MOV/QuickTime header
    mov_header = bytes(
        [
            0x00,
            0x00,
            0x00,
            0x20,  # ftyp box size
            0x66,
            0x74,
            0x79,
            0x70,  # ftyp
            0x71,
            0x74,
            0x20,
            0x20,  # qt brand
        ]
        + [0x00] * 200
    )  # Minimal data
    with open(mov_path, "wb") as f:
        f.write(mov_header)
    set_file_timestamp(mov_path, datetime(2024, 3, 10))

    # Word document
    word_content = [
        f"Meeting Notes - {datetime(2024, 1, 20).strftime('%B %d, %Y')}",
        f"",
        f"Attendees: {PLAINTIFF_NAME}, {PLAINTIFF_LAWYER}",
        f"",
        f"Discussion Points:",
        f"1. Reviewed financial disclosure documents",
        f"2. Discussed property division options",
        f"3. Next steps: File response to temporary orders",
        f"",
        f"Action Items:",
        f"- Gather additional financial records",
        f"- Schedule mediation session",
        f"- Review custody proposal",
    ]
    generate_word_document(
        "09-miscellaneous/meeting-notes-2024-01.docx", "Meeting Notes", word_content
    )

    # PowerPoint
    slides = [
        {
            "title": "Case Overview",
            "content": f'Case Number: {CASE_NUMBER}\nParties: {PLAINTIFF_NAME} vs {DEFENDANT_NAME}\nFiling Date: {FILING_DATE.strftime("%B %d, %Y")}',
        },
        {
            "title": "Key Issues",
            "content": "1. Property Division\n2. Child Custody\n3. Spousal Support\n4. Asset Valuation",
        },
        {
            "title": "Timeline",
            "content": f'Marriage: {MARRIAGE_DATE.strftime("%B %d, %Y")}\nSeparation: {FILING_DATE.strftime("%B %d, %Y")}\nHearing: April 20, 2024',
        },
    ]
    generate_powerpoint("09-miscellaneous/case-presentation.pptx", slides)

    print(f"\n✅ Successfully generated all demo case files in {CASE_DIR}")
    print(
        f"   Total files created: {sum(1 for _ in CASE_DIR.rglob('*') if _.is_file())}"
    )


if __name__ == "__main__":
    print("=" * 60)
    print("Generating Mock Divorce Case Demo Data")
    print("=" * 60)

    # Remove existing directory if it exists
    if CASE_DIR.exists():
        print(f"Removing existing directory: {CASE_DIR}")
        shutil.rmtree(CASE_DIR)

    create_directory_structure()
    generate_all_files()

    print("\n" + "=" * 60)
    print("Demo case generation complete!")
    print(f"Location: {CASE_DIR.absolute()}")
    print("=" * 60)
