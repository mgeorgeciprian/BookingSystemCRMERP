"""e-Factura service -- generates UBL 2.1 XML and uploads to ANAF SPV.

Implements Romanian e-Factura standard:
- UBL 2.1 Invoice XML format
- ANAF SPV API upload
- OAuth2 token management for ANAF
"""

import logging
from datetime import datetime, timezone

import httpx
from lxml import etree
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.business import Business
from app.models.invoice import Invoice

logger = logging.getLogger(__name__)
settings = get_settings()

# UBL 2.1 Namespaces
NS = {
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "inv": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
}


def generate_efactura_xml(invoice: Invoice, business: Business) -> str:
    """Generate UBL 2.1 compliant e-Factura XML for ANAF."""

    root = etree.Element(
        "{urn:oasis:names:specification:ubl:schema:xsd:Invoice-2}Invoice",
        nsmap={
            None: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
            "cbc": NS["cbc"],
            "cac": NS["cac"],
        },
    )

    # Header
    etree.SubElement(root, f"{{{NS['cbc']}}}CustomizationID").text = (
        "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1"
    )
    etree.SubElement(root, f"{{{NS['cbc']}}}ID").text = f"{invoice.series}{invoice.number}"
    etree.SubElement(root, f"{{{NS['cbc']}}}IssueDate").text = invoice.invoice_date.strftime(
        "%Y-%m-%d"
    )
    if invoice.due_date:
        etree.SubElement(root, f"{{{NS['cbc']}}}DueDate").text = invoice.due_date.strftime(
            "%Y-%m-%d"
        )
    etree.SubElement(root, f"{{{NS['cbc']}}}InvoiceTypeCode").text = "380"
    etree.SubElement(root, f"{{{NS['cbc']}}}DocumentCurrencyCode").text = invoice.currency

    # Supplier (business)
    supplier = etree.SubElement(root, f"{{{NS['cac']}}}AccountingSupplierParty")
    supplier_party = etree.SubElement(supplier, f"{{{NS['cac']}}}Party")

    if business.cui:
        supplier_id = etree.SubElement(supplier_party, f"{{{NS['cac']}}}PartyIdentification")
        etree.SubElement(supplier_id, f"{{{NS['cbc']}}}ID").text = business.cui

    supplier_name_el = etree.SubElement(supplier_party, f"{{{NS['cac']}}}PartyLegalEntity")
    etree.SubElement(supplier_name_el, f"{{{NS['cbc']}}}RegistrationName").text = business.name
    if business.reg_com:
        etree.SubElement(supplier_name_el, f"{{{NS['cbc']}}}CompanyID").text = business.reg_com

    if business.address:
        supplier_addr = etree.SubElement(supplier_party, f"{{{NS['cac']}}}PostalAddress")
        etree.SubElement(supplier_addr, f"{{{NS['cbc']}}}StreetName").text = business.address
        if business.city:
            etree.SubElement(supplier_addr, f"{{{NS['cbc']}}}CityName").text = business.city
        if business.postal_code:
            etree.SubElement(supplier_addr, f"{{{NS['cbc']}}}PostalZone").text = business.postal_code
        country = etree.SubElement(supplier_addr, f"{{{NS['cac']}}}Country")
        etree.SubElement(country, f"{{{NS['cbc']}}}IdentificationCode").text = business.country

    # Customer (buyer)
    customer = etree.SubElement(root, f"{{{NS['cac']}}}AccountingCustomerParty")
    customer_party = etree.SubElement(customer, f"{{{NS['cac']}}}Party")

    if invoice.buyer_cui:
        customer_id = etree.SubElement(customer_party, f"{{{NS['cac']}}}PartyIdentification")
        etree.SubElement(customer_id, f"{{{NS['cbc']}}}ID").text = invoice.buyer_cui

    customer_name_el = etree.SubElement(customer_party, f"{{{NS['cac']}}}PartyLegalEntity")
    etree.SubElement(customer_name_el, f"{{{NS['cbc']}}}RegistrationName").text = invoice.buyer_name
    if invoice.buyer_reg_com:
        etree.SubElement(customer_name_el, f"{{{NS['cbc']}}}CompanyID").text = invoice.buyer_reg_com

    if invoice.buyer_address:
        customer_addr = etree.SubElement(customer_party, f"{{{NS['cac']}}}PostalAddress")
        etree.SubElement(customer_addr, f"{{{NS['cbc']}}}StreetName").text = invoice.buyer_address

    # Tax total
    tax_total = etree.SubElement(root, f"{{{NS['cac']}}}TaxTotal")
    tax_amount = etree.SubElement(tax_total, f"{{{NS['cbc']}}}TaxAmount")
    tax_amount.set("currencyID", invoice.currency)
    tax_amount.text = f"{invoice.vat_amount:.2f}"

    # Monetary total
    monetary = etree.SubElement(root, f"{{{NS['cac']}}}LegalMonetaryTotal")
    line_ext = etree.SubElement(monetary, f"{{{NS['cbc']}}}LineExtensionAmount")
    line_ext.set("currencyID", invoice.currency)
    line_ext.text = f"{invoice.subtotal:.2f}"
    tax_excl = etree.SubElement(monetary, f"{{{NS['cbc']}}}TaxExclusiveAmount")
    tax_excl.set("currencyID", invoice.currency)
    tax_excl.text = f"{invoice.subtotal:.2f}"
    tax_incl = etree.SubElement(monetary, f"{{{NS['cbc']}}}TaxInclusiveAmount")
    tax_incl.set("currencyID", invoice.currency)
    tax_incl.text = f"{invoice.total:.2f}"
    payable = etree.SubElement(monetary, f"{{{NS['cbc']}}}PayableAmount")
    payable.set("currencyID", invoice.currency)
    payable.text = f"{invoice.total:.2f}"

    # Invoice lines
    for idx, item in enumerate(invoice.line_items, 1):
        line = etree.SubElement(root, f"{{{NS['cac']}}}InvoiceLine")
        etree.SubElement(line, f"{{{NS['cbc']}}}ID").text = str(idx)

        qty = etree.SubElement(line, f"{{{NS['cbc']}}}InvoicedQuantity")
        qty.set("unitCode", "C62")
        qty.text = str(item.get("quantity", 1))

        line_amount = etree.SubElement(line, f"{{{NS['cbc']}}}LineExtensionAmount")
        line_amount.set("currencyID", invoice.currency)
        item_subtotal = item.get("quantity", 1) * item.get("unit_price", 0)
        line_amount.text = f"{item_subtotal:.2f}"

        # Item
        inv_item = etree.SubElement(line, f"{{{NS['cac']}}}Item")
        etree.SubElement(inv_item, f"{{{NS['cbc']}}}Name").text = item.get("description", "")

        # Tax
        tax_cat = etree.SubElement(inv_item, f"{{{NS['cac']}}}ClassifiedTaxCategory")
        etree.SubElement(tax_cat, f"{{{NS['cbc']}}}Percent").text = str(item.get("vat_rate", 19))
        tax_scheme = etree.SubElement(tax_cat, f"{{{NS['cac']}}}TaxScheme")
        etree.SubElement(tax_scheme, f"{{{NS['cbc']}}}ID").text = "VAT"

        # Price
        price_el = etree.SubElement(line, f"{{{NS['cac']}}}Price")
        price_amount = etree.SubElement(price_el, f"{{{NS['cbc']}}}PriceAmount")
        price_amount.set("currencyID", invoice.currency)
        price_amount.text = f"{item.get('unit_price', 0):.2f}"

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True).decode()


async def upload_to_anaf(
    db: AsyncSession,
    invoice: Invoice,
    business: Business,
) -> dict:
    """Upload e-Factura XML to ANAF SPV API."""

    if not business.anaf_oauth_token:
        return {"success": False, "error": "Token ANAF OAuth nu este configurat"}

    # Check token expiry
    if business.anaf_token_expires_at and business.anaf_token_expires_at < datetime.now(timezone.utc):
        return {"success": False, "error": "Token ANAF expirat - necesita reautorizare"}

    # Generate XML
    xml_content = generate_efactura_xml(invoice, business)
    invoice.efactura_xml = xml_content

    # Upload to ANAF
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.ANAF_API_BASE_URL}/prod/FCTEL/rest/upload",
                params={
                    "standard": "UBL",
                    "cif": business.cui,
                },
                headers={
                    "Authorization": f"Bearer {business.anaf_oauth_token}",
                    "Content-Type": "application/xml",
                },
                content=xml_content.encode("utf-8"),
            )

            if resp.status_code == 200:
                data = resp.json()
                invoice.efactura_upload_id = data.get("index_incarcare")
                invoice.efactura_status = "uploaded"
                invoice.efactura_response = data
                return {"success": True, "upload_id": data.get("index_incarcare")}
            else:
                error = resp.text
                invoice.efactura_status = "rejected"
                invoice.efactura_response = {"error": error, "status_code": resp.status_code}
                return {"success": False, "error": error}

    except httpx.HTTPError as e:
        invoice.efactura_status = "rejected"
        invoice.efactura_response = {"error": str(e)}
        return {"success": False, "error": str(e)}
