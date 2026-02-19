"""Invoice PDF generation service using WeasyPrint.

Generates Romanian-compliant PDF invoices (factura fiscala) with:
- Serie + numar factura
- CUI / Reg. Com. for both supplier and buyer
- TVA breakdown (19%, 9%, 5%, 0%)
- Romanian legal text and formatting
- Line items with quantity, unit price, VAT, total
- Business logo support
- Ready for WhatsApp/email delivery and ANAF e-Factura pipeline
"""

import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from weasyprint import HTML

if TYPE_CHECKING:
    from app.models.business import Business
    from app.models.invoice import Invoice

logger = logging.getLogger(__name__)

# Directory for generated PDFs (local development fallback; production uses GCS)
PDF_OUTPUT_DIR = Path(tempfile.gettempdir()) / "bookingcrm_invoices"
PDF_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _format_ron(amount: float) -> str:
    """Format a number as Romanian currency (e.g., 1.234,56)."""
    # Python formats with dot as decimal; Romanian uses comma
    formatted = f"{amount:,.2f}"
    # Swap separators: 1,234.56 -> 1.234,56
    formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
    return formatted


def _format_date_ro(dt: datetime) -> str:
    """Format datetime as Romanian date string (DD.MM.YYYY)."""
    return dt.strftime("%d.%m.%Y")


def _build_invoice_html(invoice: "Invoice", business: "Business") -> str:
    """Build the HTML template for a Romanian invoice (factura fiscala).

    Follows Romanian accounting standards:
    - Serie + numar factura
    - Supplier / buyer identification with CUI, Reg. Com.
    - Line items with quantity, unit price, TVA rate, total
    - TVA summary breakdown by rate
    - Total in RON with Romanian number formatting
    """

    # Determine display names
    invoice_number_display = f"{invoice.series}{invoice.number:06d}"
    issue_date_display = _format_date_ro(invoice.invoice_date)
    due_date_display = _format_date_ro(invoice.due_date) if invoice.due_date else "-"

    # Supplier info (the business)
    supplier_name = business.name
    supplier_cui = business.cui or "-"
    supplier_reg_com = business.reg_com or "-"
    supplier_address = business.address or "-"
    supplier_city = business.city or ""
    supplier_county = business.county or ""
    supplier_postal_code = business.postal_code or ""
    supplier_phone = business.phone or "-"
    supplier_email = business.email or "-"

    # Build full supplier address line
    supplier_full_address_parts = [supplier_address]
    if supplier_city:
        supplier_full_address_parts.append(supplier_city)
    if supplier_county:
        supplier_full_address_parts.append(f"Jud. {supplier_county}")
    if supplier_postal_code:
        supplier_full_address_parts.append(f"Cod postal {supplier_postal_code}")
    supplier_full_address = ", ".join(part for part in supplier_full_address_parts if part and part != "-")

    # Buyer info (from the invoice, denormalized for immutability)
    buyer_name = invoice.buyer_name
    buyer_cui = invoice.buyer_cui or "-"
    buyer_reg_com = invoice.buyer_reg_com or "-"
    buyer_address = invoice.buyer_address or "-"
    buyer_email = invoice.buyer_email or "-"
    buyer_phone = invoice.buyer_phone or "-"
    buyer_type_label = "CUI" if invoice.buyer_is_company else "CNP"

    # Build line items HTML rows
    line_items_html = ""
    for index, item in enumerate(invoice.line_items, 1):
        description = item.get("description", "")
        quantity = item.get("quantity", 1)
        unit_price = item.get("unit_price", 0)
        vat_rate = item.get("vat_rate", 19)
        item_subtotal = quantity * unit_price
        item_vat = item_subtotal * vat_rate / 100
        item_total = item_subtotal + item_vat

        line_items_html += f"""
        <tr>
            <td class="center">{index}</td>
            <td>{description}</td>
            <td class="center">buc</td>
            <td class="right">{quantity}</td>
            <td class="right">{_format_ron(unit_price)}</td>
            <td class="right">{_format_ron(item_subtotal)}</td>
            <td class="center">{int(vat_rate)}%</td>
            <td class="right">{_format_ron(item_vat)}</td>
            <td class="right">{_format_ron(item_total)}</td>
        </tr>
        """

    # Build TVA summary grouped by rate
    vat_summary: dict[float, dict[str, float]] = {}
    for item in invoice.line_items:
        vat_rate = item.get("vat_rate", 19)
        quantity = item.get("quantity", 1)
        unit_price = item.get("unit_price", 0)
        item_subtotal = quantity * unit_price
        item_vat = item_subtotal * vat_rate / 100

        if vat_rate not in vat_summary:
            vat_summary[vat_rate] = {"base": 0.0, "vat": 0.0}
        vat_summary[vat_rate]["base"] += item_subtotal
        vat_summary[vat_rate]["vat"] += item_vat

    vat_summary_html = ""
    for vat_rate in sorted(vat_summary.keys()):
        totals = vat_summary[vat_rate]
        vat_summary_html += f"""
        <tr>
            <td>TVA {int(vat_rate)}%</td>
            <td class="right">{_format_ron(totals['base'])}</td>
            <td class="right">{_format_ron(totals['vat'])}</td>
        </tr>
        """

    # Payment status badge
    payment_status_map = {
        "unpaid": ("Neplatita", "#dc2626"),
        "paid": ("Platita", "#16a34a"),
        "partial": ("Partial platita", "#d97706"),
    }
    payment_label, payment_color = payment_status_map.get(
        invoice.payment_status, ("Neplatita", "#dc2626")
    )

    # Notes section
    notes_html = ""
    if invoice.notes:
        notes_html = f"""
        <div class="notes">
            <strong>Observatii:</strong> {invoice.notes}
        </div>
        """

    # Build the complete HTML document
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ro">
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 15mm 20mm 20mm 20mm;
            }}

            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            body {{
                font-family: 'DejaVu Sans', 'Arial', sans-serif;
                font-size: 9pt;
                line-height: 1.4;
                color: #1e293b;
            }}

            .header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 3px solid #0f172a;
            }}

            .header-left {{
                flex: 1;
            }}

            .header-right {{
                text-align: right;
                flex: 0 0 auto;
            }}

            .invoice-title {{
                font-size: 22pt;
                font-weight: 700;
                color: #0f172a;
                letter-spacing: 1px;
            }}

            .invoice-number {{
                font-size: 11pt;
                color: #2563eb;
                font-weight: 600;
                margin-top: 4px;
            }}

            .invoice-dates {{
                margin-top: 8px;
                font-size: 9pt;
            }}

            .invoice-dates span {{
                display: inline-block;
                margin-right: 20px;
            }}

            .payment-badge {{
                display: inline-block;
                padding: 3px 12px;
                border-radius: 4px;
                color: white;
                font-weight: 600;
                font-size: 8pt;
                margin-top: 6px;
                background-color: {payment_color};
            }}

            .parties {{
                display: flex;
                gap: 30px;
                margin-bottom: 20px;
            }}

            .party {{
                flex: 1;
                padding: 12px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background-color: #f8fafc;
            }}

            .party-title {{
                font-size: 8pt;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #64748b;
                font-weight: 600;
                margin-bottom: 6px;
                padding-bottom: 4px;
                border-bottom: 1px solid #e2e8f0;
            }}

            .party-name {{
                font-size: 11pt;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 4px;
            }}

            .party-detail {{
                font-size: 8.5pt;
                color: #475569;
                margin-bottom: 2px;
            }}

            .party-detail strong {{
                color: #334155;
                display: inline-block;
                min-width: 70px;
            }}

            table.items {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 8.5pt;
            }}

            table.items thead {{
                background-color: #0f172a;
                color: white;
            }}

            table.items thead th {{
                padding: 8px 6px;
                text-align: left;
                font-weight: 600;
                font-size: 8pt;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}

            table.items tbody td {{
                padding: 7px 6px;
                border-bottom: 1px solid #e2e8f0;
            }}

            table.items tbody tr:nth-child(even) {{
                background-color: #f8fafc;
            }}

            .center {{ text-align: center; }}
            .right {{ text-align: right; }}

            .totals-section {{
                display: flex;
                justify-content: flex-end;
                margin-bottom: 15px;
            }}

            table.totals {{
                width: 320px;
                border-collapse: collapse;
                font-size: 9pt;
            }}

            table.totals td {{
                padding: 5px 10px;
            }}

            table.totals tr.subtotal {{
                border-top: 1px solid #e2e8f0;
            }}

            table.totals tr.grand-total {{
                border-top: 2px solid #0f172a;
                font-weight: 700;
                font-size: 11pt;
                color: #0f172a;
            }}

            table.totals tr.grand-total td {{
                padding-top: 8px;
            }}

            .vat-summary {{
                margin-bottom: 15px;
            }}

            table.vat-table {{
                width: 320px;
                border-collapse: collapse;
                font-size: 8.5pt;
                margin-left: auto;
            }}

            table.vat-table th {{
                background-color: #f1f5f9;
                padding: 5px 10px;
                text-align: left;
                font-size: 8pt;
                text-transform: uppercase;
                color: #64748b;
            }}

            table.vat-table td {{
                padding: 4px 10px;
                border-bottom: 1px solid #f1f5f9;
            }}

            .notes {{
                padding: 10px;
                background-color: #fffbeb;
                border: 1px solid #fde68a;
                border-radius: 4px;
                font-size: 8.5pt;
                margin-bottom: 15px;
            }}

            .footer {{
                margin-top: 20px;
                padding-top: 12px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
            }}

            .signature-block {{
                text-align: center;
                width: 200px;
            }}

            .signature-line {{
                border-top: 1px solid #94a3b8;
                margin-top: 50px;
                padding-top: 4px;
                font-size: 8pt;
                color: #64748b;
            }}

            .legal-notice {{
                margin-top: 20px;
                font-size: 7pt;
                color: #94a3b8;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <div class="invoice-title">FACTURA</div>
                <div class="invoice-number">Serie: {invoice.series} / Nr: {invoice.number:06d}</div>
                <div class="invoice-dates">
                    <span><strong>Data emiterii:</strong> {issue_date_display}</span>
                    <span><strong>Data scadenta:</strong> {due_date_display}</span>
                </div>
            </div>
            <div class="header-right">
                <div class="payment-badge">{payment_label}</div>
                <div style="margin-top: 8px; font-size: 8pt; color: #64748b;">
                    Moneda: {invoice.currency}
                </div>
            </div>
        </div>

        <!-- Supplier & Buyer -->
        <div class="parties">
            <div class="party">
                <div class="party-title">Furnizor</div>
                <div class="party-name">{supplier_name}</div>
                <div class="party-detail"><strong>CUI:</strong> {supplier_cui}</div>
                <div class="party-detail"><strong>Reg. Com.:</strong> {supplier_reg_com}</div>
                <div class="party-detail"><strong>Adresa:</strong> {supplier_full_address}</div>
                <div class="party-detail"><strong>Telefon:</strong> {supplier_phone}</div>
                <div class="party-detail"><strong>Email:</strong> {supplier_email}</div>
            </div>
            <div class="party">
                <div class="party-title">Cumparator</div>
                <div class="party-name">{buyer_name}</div>
                <div class="party-detail"><strong>{buyer_type_label}:</strong> {buyer_cui}</div>
                <div class="party-detail"><strong>Reg. Com.:</strong> {buyer_reg_com}</div>
                <div class="party-detail"><strong>Adresa:</strong> {buyer_address}</div>
                <div class="party-detail"><strong>Email:</strong> {buyer_email}</div>
                <div class="party-detail"><strong>Telefon:</strong> {buyer_phone}</div>
            </div>
        </div>

        <!-- Line Items -->
        <table class="items">
            <thead>
                <tr>
                    <th class="center" style="width: 30px;">Nr.</th>
                    <th>Descriere produs / serviciu</th>
                    <th class="center" style="width: 35px;">U.M.</th>
                    <th class="right" style="width: 45px;">Cant.</th>
                    <th class="right" style="width: 70px;">Pret unitar</th>
                    <th class="right" style="width: 75px;">Valoare</th>
                    <th class="center" style="width: 40px;">TVA %</th>
                    <th class="right" style="width: 65px;">TVA</th>
                    <th class="right" style="width: 75px;">Total</th>
                </tr>
            </thead>
            <tbody>
                {line_items_html}
            </tbody>
        </table>

        <!-- VAT Summary -->
        <div class="vat-summary">
            <table class="vat-table">
                <thead>
                    <tr>
                        <th>Cota TVA</th>
                        <th class="right">Baza impozabila</th>
                        <th class="right">Valoare TVA</th>
                    </tr>
                </thead>
                <tbody>
                    {vat_summary_html}
                </tbody>
            </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
            <table class="totals">
                <tr class="subtotal">
                    <td>Subtotal (fara TVA):</td>
                    <td class="right">{_format_ron(invoice.subtotal)} {invoice.currency}</td>
                </tr>
                <tr>
                    <td>TVA total:</td>
                    <td class="right">{_format_ron(invoice.vat_amount)} {invoice.currency}</td>
                </tr>
                <tr class="grand-total">
                    <td>TOTAL DE PLATA:</td>
                    <td class="right">{_format_ron(invoice.total)} {invoice.currency}</td>
                </tr>
            </table>
        </div>

        <!-- Notes -->
        {notes_html}

        <!-- Signatures -->
        <div class="footer">
            <div class="signature-block">
                <div class="signature-line">Semnatura furnizor</div>
            </div>
            <div class="signature-block">
                <div class="signature-line">Semnatura cumparator</div>
            </div>
        </div>

        <!-- Legal notice -->
        <div class="legal-notice">
            Factura generata automat de BookingCRM SaaS. Document valid fara semnatura si stampila conform art. 319 alin. 29 din Codul Fiscal.
        </div>
    </body>
    </html>
    """

    return html_content


def generate_invoice_pdf(invoice: "Invoice", business: "Business") -> bytes:
    """Generate a PDF invoice and return the raw bytes.

    Args:
        invoice: The Invoice model instance with all fields populated.
        business: The Business model instance (supplier info).

    Returns:
        PDF file content as bytes.

    Raises:
        RuntimeError: If WeasyPrint fails to generate the PDF.
    """
    try:
        html_content = _build_invoice_html(invoice, business)
        html_document = HTML(string=html_content)
        pdf_bytes = html_document.write_pdf()
        logger.info(
            "Generated PDF invoice %s%06d for business %d (%d bytes)",
            invoice.series, invoice.number, business.id, len(pdf_bytes),
        )
        return pdf_bytes
    except Exception as error:
        logger.error(
            "Failed to generate PDF for invoice %s%06d: %s",
            invoice.series, invoice.number, error,
        )
        raise RuntimeError(f"Eroare la generarea PDF-ului facturii: {error}") from error


def save_invoice_pdf_to_disk(
    invoice: "Invoice",
    business: "Business",
    output_directory: Path | None = None,
) -> Path:
    """Generate a PDF invoice and save it to disk.

    Args:
        invoice: The Invoice model instance.
        business: The Business model instance.
        output_directory: Directory to save the PDF. Defaults to temp directory.

    Returns:
        Path to the generated PDF file.
    """
    target_directory = output_directory or PDF_OUTPUT_DIR
    target_directory.mkdir(parents=True, exist_ok=True)

    pdf_bytes = generate_invoice_pdf(invoice, business)
    filename = f"factura_{invoice.series}{invoice.number:06d}_{business.slug or business.id}.pdf"
    file_path = target_directory / filename

    file_path.write_bytes(pdf_bytes)
    logger.info("Saved invoice PDF to %s", file_path)
    return file_path


async def generate_and_store_invoice_pdf(
    invoice: "Invoice",
    business: "Business",
) -> str:
    """Generate PDF, store it, and return the file URL/path.

    In production this would upload to Google Cloud Storage.
    In development, saves to local temp directory and returns the local path.

    Args:
        invoice: The Invoice model instance.
        business: The Business model instance.

    Returns:
        URL or file path string for the stored PDF.
    """
    from app.core.config import get_settings
    settings = get_settings()

    pdf_bytes = generate_invoice_pdf(invoice, business)
    filename = f"factura_{invoice.series}{invoice.number:06d}_{business.slug or business.id}.pdf"

    if settings.GCS_BUCKET:
        # Production: upload to Google Cloud Storage
        try:
            from google.cloud import storage as gcs_storage
            gcs_client = gcs_storage.Client(project=settings.GCS_PROJECT_ID)
            bucket = gcs_client.bucket(settings.GCS_BUCKET)
            blob = bucket.blob(f"invoices/{business.id}/{filename}")
            blob.upload_from_string(pdf_bytes, content_type="application/pdf")
            # Make the blob publicly accessible or use signed URL
            public_url = blob.public_url
            logger.info("Uploaded invoice PDF to GCS: %s", public_url)
            return public_url
        except Exception as gcs_error:
            logger.error("Failed to upload PDF to GCS, falling back to local: %s", gcs_error)

    # Development fallback: save to disk
    file_path = PDF_OUTPUT_DIR / filename
    file_path.write_bytes(pdf_bytes)
    local_url = f"/static/invoices/{filename}"
    logger.info("Saved invoice PDF locally: %s (url: %s)", file_path, local_url)
    return local_url


async def process_invoice_after_payment(
    db: "AsyncSession",
    invoice: "Invoice",
    business: "Business",
) -> dict:
    """Complete invoice pipeline after payment is finalized.

    Pipeline:
    1. Generate PDF invoice
    2. Store PDF (GCS or local)
    3. Update invoice record with pdf_url
    4. Send PDF to customer via WhatsApp (preferred) or email
    5. Submit e-Factura to ANAF if applicable (B2B > 5,000 RON)

    Args:
        db: Async database session.
        invoice: The paid Invoice model instance.
        business: The Business model instance.

    Returns:
        Dict with pipeline results.
    """
    from sqlalchemy.ext.asyncio import AsyncSession

    pipeline_results = {
        "pdf_generated": False,
        "pdf_url": None,
        "notification_sent": False,
        "notification_channel": None,
        "efactura_submitted": False,
        "efactura_upload_id": None,
        "errors": [],
    }

    # Step 1 & 2: Generate and store PDF
    try:
        pdf_url = await generate_and_store_invoice_pdf(invoice, business)
        invoice.pdf_url = pdf_url
        invoice.status = "sent"
        pipeline_results["pdf_generated"] = True
        pipeline_results["pdf_url"] = pdf_url
    except Exception as pdf_error:
        error_message = f"Eroare generare PDF: {pdf_error}"
        pipeline_results["errors"].append(error_message)
        logger.error(error_message)

    # Step 3: Send PDF to customer via notification service
    if pipeline_results["pdf_generated"] and invoice.client_id:
        try:
            from app.models.client import Client
            from app.services.notification import send_invoice_notification

            client = await db.get(Client, invoice.client_id)
            if client:
                pdf_bytes = generate_invoice_pdf(invoice, business)
                notification_result = await send_invoice_notification(
                    db=db,
                    business=business,
                    client=client,
                    invoice=invoice,
                    pdf_bytes=pdf_bytes,
                )
                pipeline_results["notification_sent"] = notification_result.get("status") == "sent"
                pipeline_results["notification_channel"] = notification_result.get("channel")
        except Exception as notification_error:
            error_message = f"Eroare trimitere notificare: {notification_error}"
            pipeline_results["errors"].append(error_message)
            logger.error(error_message)

    # Step 4: Submit e-Factura to ANAF if applicable
    # Conditions: B2B invoice, business has e-Factura enabled, and ANAF token present
    should_submit_efactura = (
        business.efactura_enabled
        and invoice.buyer_is_company
        and business.anaf_oauth_token
    )

    # Romanian law requires e-Factura for all B2B invoices (since Jan 2024)
    # Additional enforcement for invoices over 5,000 RON
    if should_submit_efactura:
        try:
            from app.services.efactura import upload_to_anaf

            anaf_result = await upload_to_anaf(db, invoice, business)
            pipeline_results["efactura_submitted"] = anaf_result.get("success", False)
            pipeline_results["efactura_upload_id"] = anaf_result.get("upload_id")
            if not anaf_result.get("success"):
                pipeline_results["errors"].append(
                    f"Eroare ANAF e-Factura: {anaf_result.get('error')}"
                )
        except Exception as anaf_error:
            error_message = f"Eroare submitere ANAF: {anaf_error}"
            pipeline_results["errors"].append(error_message)
            logger.error(error_message)

    await db.flush()

    logger.info(
        "Invoice pipeline complete for %s%06d: pdf=%s, notification=%s, efactura=%s, errors=%d",
        invoice.series, invoice.number,
        pipeline_results["pdf_generated"],
        pipeline_results["notification_sent"],
        pipeline_results["efactura_submitted"],
        len(pipeline_results["errors"]),
    )

    return pipeline_results
