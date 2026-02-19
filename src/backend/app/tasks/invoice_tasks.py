"""Celery tasks for invoice PDF generation and delivery pipeline.

Async pipeline:
1. Generate PDF invoice using WeasyPrint
2. Store PDF (GCS in production, local in development)
3. Send PDF to customer via WhatsApp (preferred) or email
4. Submit e-Factura to ANAF if applicable (B2B invoice)
"""

import asyncio
import logging

from app.core.database import AsyncSessionLocal
from app.models.business import Business
from app.models.invoice import Invoice
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _process_invoice_pipeline(invoice_id: int, business_id: int) -> dict:
    """Run the full invoice pipeline asynchronously.

    Args:
        invoice_id: The invoice to process.
        business_id: The business owning the invoice.

    Returns:
        Pipeline result dict.
    """
    async with AsyncSessionLocal() as db:
        invoice = await db.get(Invoice, invoice_id)
        if not invoice:
            logger.error("Invoice %d not found for pipeline processing", invoice_id)
            return {"error": f"Factura {invoice_id} nu a fost gasita"}

        if invoice.business_id != business_id:
            logger.error(
                "Invoice %d does not belong to business %d",
                invoice_id, business_id,
            )
            return {"error": "Factura nu apartine acestei afaceri"}

        business = await db.get(Business, business_id)
        if not business:
            logger.error("Business %d not found", business_id)
            return {"error": f"Afacerea {business_id} nu a fost gasita"}

        from app.services.invoice_pdf import process_invoice_after_payment

        result = await process_invoice_after_payment(db, invoice, business)
        await db.commit()
        return result


@celery_app.task(
    name="app.tasks.invoice_tasks.process_invoice_pipeline",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def process_invoice_pipeline(self, invoice_id: int, business_id: int):
    """Celery task: run the full invoice pipeline (PDF -> send -> e-Factura).

    Retries up to 3 times with 60-second delay on failure.
    """
    try:
        result = asyncio.run(_process_invoice_pipeline(invoice_id, business_id))
        if result.get("errors"):
            logger.warning(
                "Invoice pipeline for %d completed with errors: %s",
                invoice_id, result["errors"],
            )
        return result
    except Exception as pipeline_error:
        logger.error(
            "Invoice pipeline failed for %d: %s (retry %d/%d)",
            invoice_id, pipeline_error, self.request.retries, self.max_retries,
        )
        raise self.retry(exc=pipeline_error)
