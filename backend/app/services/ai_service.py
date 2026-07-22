import os
import json
import re
from datetime import datetime, timedelta
from functools import lru_cache

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

def get_ai_client():
    if not genai:
        return None
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return genai.Client(api_key=api_key)
    return None

@lru_cache(maxsize=1000)
def generate_description_cached(name: str) -> str:
    client = get_ai_client()
    if not client:
        return f"Provides premium professional {name.lower()} services tailored to the client's specifications, including complete planning, execution, detail configuration, and dedicated consulting support."
    
    prompt = f'Write a professional, concise, polished invoice line item description for the service/product named: "{name}". Keep it to 15-25 words. Make it sound appealing to a professional corporate client. Do not use quotation marks around the answer.'
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.7)
        )
        return response.text.strip() if response.text else f"High quality {name} deliverables and consulting solutions."
    except Exception as e:
        print(f"AI Description Error: {e}")
        raise Exception("Failed to generate AI description")

def parse_invoice_cached(prompt: str, current_invoice: dict | None = None, allowed_fields: list[str] | None = None) -> dict:
    pre_parsed = {}
    client = get_ai_client()
    today = datetime.now().strftime('%Y-%m-%d')
    due_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')

    if not client:
        guessed_amount = 1500.0
        match = re.search(r'(?:[\$\€\£\₹]|\bUSD|\bINR)\s*([\d,]+)', prompt, re.IGNORECASE)
        if match:
            guessed_amount = float(match.group(1).replace(',', ''))
        
        client_name = "ABC Enterprises"
        if "company" in prompt.lower():
            client_name = "Company Inc."
            
        return {
            "clientName": client_name,
            "date": today,
            "dueDate": due_date,
            "currency": "INR" if "₹" in prompt or "inr" in prompt.lower() else "USD",
            "items": [
                {
                    "name": "Consultancy & General Business Solutions",
                    "rate": guessed_amount,
                    "quantity": 1,
                    "taxPercentage": 10,
                    "description": "AI-parsed standard billing service category item description details."
                }
            ],
            "notes": "Parsed from context: " + prompt,
            "isMock": True
        }

    current_context_str = ""
    if current_invoice:
        current_context_str = f"\nCURRENT INVOICE STATE (Context):\n{json.dumps(current_invoice, indent=2)}\n"

    allowed_str = ""
    if allowed_fields and len(allowed_fields) > 0:
        allowed_str = f"\nCRITICAL FIELD CONSTRAINT: Only extract values for the following fields that exist in the active template: {', '.join(allowed_fields)}. If the user prompt contains information for a field NOT in this list, DROP that information. Do NOT invent new JSON keys outside this list!\n"

    system_instruction = f"""You are a high-fidelity bill parser. Interpret the user's natural language request to update or create an invoice and construct a clean, valid JSON representation.

{allowed_str}
{current_context_str}

1. Instructions & Actions:
   - Extract and update ALL details written by the user using any phrasing, synonym, or alias:
     * Bill To / Client / Buyer / Customer / Party: clientName, clientEmail, clientPhone, clientAddress, clientGstin, clientPan, clientState, clientCountry.
     * Ship To / Consignee / Delivery Address: shippedToName, shippedToPhone, shippedToEmail, shippedToAddress, shippedToGstin, shippedToPan, shippedToState, shippedToCountry.
     * Copying Intent: If user requests "same as bill", "copy billing", "ship to same", "same consignee", set copyBillingToShipping: true and copy client values.
     * Transport / Vehicle / Carrier / Dispatch: transport, vehicleNo (truck/lorry/car/reg no), grRrNo, driverMobile, station, ewayBillNo, placeOfSupply.
     * Financials & Charges: discountType ('percent' or 'flat'), discountValue (% off, flat discount, rebate), freightCharges (shipping/delivery/courier/transport fee).
     * Terms & Notes: notes (comments, special instructions), invoiceTerms (contract terms, payment conditions).
     * Document Info & PO: PO number (order no, purchase order), reference number (ref no, tracking), delivery note, invoice number, dates ("due in 14 days", "net 30", "due next week").
     * Template & Styling: templatePreset (Classic, GST, Retail, Corporate, Simple, Medical, Export, Minimalist, Tech, Agency), templateStyle, primaryColor, fontFamily, invoiceType ('invoice' or 'estimate'), status, taxMode ('dynamic' or 'custom'), customTaxName, customTaxPercentage, isRecurring, recurringInterval ('weekly', 'monthly', 'yearly').
2. Field Synonym & Alias Rule:
   - Recognize terms like "buyer", "party", "customer", "consignee", "deliver to", "lorry", "truck", "shipping fee", "courier cost", "tax id", "order no", "rebate", "concession" as valid field mappings.
3. Financial & Freight Charges Rule:
   - NEVER add freight charges, transport fees, shipping costs, or discounts into the 'items' array as line items in the product table!
   - Transport/freight charges MUST be returned exclusively in the 'freightCharges' property.
   - Discounts MUST be returned exclusively in 'discountValue' and 'discountType' ('percent' or 'flat') properties.
4. If the user's prompt DOES NOT explicitly mention any products, services, or line items to add to the invoice (e.g. if the prompt is about changing layout, shipping, transport charges, discounts, or advanced settings), DO NOT include any items in the 'items' array. Leave the 'items' array empty. Do not hallucinate or guess products.
Use standard fallback fields for today's date {today} and a due date exactly 14 days later."""

    schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "copyBillingToShipping": types.Schema(type=types.Type.BOOLEAN, description="Set to true if user requests to copy/set ship to details same as bill to / billing"),
            "clientName": types.Schema(type=types.Type.STRING, description="Name of the client, party, buyer, or customer"),
            "clientEmail": types.Schema(type=types.Type.STRING, description="Client email parsed if provided"),
            "clientPhone": types.Schema(type=types.Type.STRING, description="Client phone parsed if provided"),
            "clientAddress": types.Schema(type=types.Type.STRING, description="Client address parsed if provided"),
            "clientGstin": types.Schema(type=types.Type.STRING, description="Client GSTIN or Tax Registration parsed if provided"),
            "clientPan": types.Schema(type=types.Type.STRING, description="Client PAN parsed if provided"),
            "clientState": types.Schema(type=types.Type.STRING, description="Client State parsed if provided"),
            "clientCountry": types.Schema(type=types.Type.STRING, description="Client Country parsed if provided"),
            "shippedToName": types.Schema(type=types.Type.STRING, description="Shipping/Consignee Name parsed if provided"),
            "shippedToPhone": types.Schema(type=types.Type.STRING, description="Shipping Phone parsed if provided"),
            "shippedToEmail": types.Schema(type=types.Type.STRING, description="Shipping Email parsed if provided"),
            "shippedToAddress": types.Schema(type=types.Type.STRING, description="Shipping Address parsed if provided"),
            "shippedToGstin": types.Schema(type=types.Type.STRING, description="Shipping GSTIN parsed if provided"),
            "shippedToPan": types.Schema(type=types.Type.STRING, description="Shipping PAN parsed if provided"),
            "shippedToState": types.Schema(type=types.Type.STRING, description="Shipping State parsed if provided"),
            "shippedToCountry": types.Schema(type=types.Type.STRING, description="Shipping Country parsed if provided"),
            "invoiceNumber": types.Schema(type=types.Type.STRING, description="Invoice number if specified"),
            "date": types.Schema(type=types.Type.STRING, description="Invoice date in YYYY-MM-DD format if specified"),
            "dueDate": types.Schema(type=types.Type.STRING, description="Invoice due date in YYYY-MM-DD format if specified"),
            "poNumber": types.Schema(type=types.Type.STRING, description="Purchase Order (PO / Order) number if specified"),
            "referenceNumber": types.Schema(type=types.Type.STRING, description="Reference / Tracking number if specified"),
            "deliveryNote": types.Schema(type=types.Type.STRING, description="Delivery note if specified"),
            "notes": types.Schema(type=types.Type.STRING, description="Notes or special comments"),
            "invoiceTerms": types.Schema(type=types.Type.STRING, description="Payment terms or contract conditions"),
            "placeOfSupply": types.Schema(type=types.Type.STRING, description="Place of supply"),
            "transport": types.Schema(type=types.Type.STRING, description="Transport / Courier / Carrier mode"),
            "vehicleNo": types.Schema(type=types.Type.STRING, description="Vehicle / Truck / Lorry / Car registration number e.g. MH12AB1234"),
            "vehicleNumber": types.Schema(type=types.Type.STRING, description="Vehicle number or registration number"),
            "vehicle": types.Schema(type=types.Type.STRING, description="Vehicle number or registration number"),
            "grRrNo": types.Schema(type=types.Type.STRING, description="GR/RR number"),
            "driverMobile": types.Schema(type=types.Type.STRING, description="Driver mobile number"),
            "station": types.Schema(type=types.Type.STRING, description="Station"),
            "ewayBillNo": types.Schema(type=types.Type.STRING, description="E-Way Bill number"),
            "discountType": types.Schema(type=types.Type.STRING, description="'none', 'percent', or 'flat'"),
            "discountValue": types.Schema(type=types.Type.NUMBER, description="Discount amount or percentage"),
            "freightCharges": types.Schema(type=types.Type.NUMBER, description="Freight / shipping / delivery / courier charges"),
            "currency": types.Schema(type=types.Type.STRING, description="e.g. USD, INR, EUR, GBP based on symbols like ₹, $, €"),
            "templatePreset": types.Schema(type=types.Type.STRING, description="Template preset requested e.g. Classic, GST, Retail, Corporate, Simple, Medical, Export"),
            "templateStyle": types.Schema(type=types.Type.STRING, description="Layout style e.g. professional, modern, classic, minimal, corporate, agency, enterprise"),
            "primaryColor": types.Schema(type=types.Type.STRING, description="Primary theme color e.g. #ea580c, blue, indigo, red, green, dark, purple"),
            "fontFamily": types.Schema(type=types.Type.STRING, description="Font family e.g. Inter, Roboto, Space Grotesk, Playfair Display, Mono"),
            "invoiceType": types.Schema(type=types.Type.STRING, description="'invoice' or 'estimate'"),
            "status": types.Schema(type=types.Type.STRING, description="'pending', 'paid', 'draft', 'cancelled', 'approved'"),
            "taxMode": types.Schema(type=types.Type.STRING, description="'dynamic' or 'custom'"),
            "customTaxName": types.Schema(type=types.Type.STRING, description="Custom tax name e.g. VAT, Sales Tax"),
            "customTaxPercentage": types.Schema(type=types.Type.NUMBER, description="Custom tax percentage e.g. 5, 10, 18"),
            "isRecurring": types.Schema(type=types.Type.BOOLEAN, description="Whether invoice is recurring"),
            "recurringInterval": types.Schema(type=types.Type.STRING, description="'weekly', 'bi-weekly', 'monthly', 'yearly'"),
            "items": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "name": types.Schema(type=types.Type.STRING, description="Service or Product name"),
                        "rate": types.Schema(type=types.Type.NUMBER, description="Unit rate"),
                        "quantity": types.Schema(type=types.Type.NUMBER, description="Quantity"),
                        "quantityType": types.Schema(type=types.Type.STRING, description="Unit of quantity e.g. 'box', 'pcs', 'kg', 'hrs', 'units', 'bags', 'm', 'ft', etc."),
                        "taxPercentage": types.Schema(type=types.Type.NUMBER, description="Suggested appropriate tax rate e.g. 10"),
                        "hsnCode": types.Schema(type=types.Type.STRING, description="HSN/SAC code if specified"),
                        "description": types.Schema(type=types.Type.STRING, description="ONLY include if user explicitly stated a description for this item in the prompt")
                    },
                    required=["name", "rate", "quantity"]
                )
            )
        },
        required=[]
    )

    pre_parsed = {}
    lower_prompt = prompt.lower()

    # 1. Copy Billing to Shipping Intent
    if any(phrase in lower_prompt for phrase in ["same as bill", "same as billing", "copy bill", "copy billing", "ship to details same", "ship to same", "same consignee"]):
        pre_parsed["copyBillingToShipping"] = True

    # 2. Client / Buyer / Customer Name Intent (e.g. "client name is Reliance", "change client to Tata", "buyer Acme", "party John")
    client_m = re.search(r'(?:client|customer|buyer|party|consignee|bill to|billed to|change client|set client|set customer)\s*(?:name)?\s*(?:is|as|=|:|\s)\s*([A-Za-z0-9\s&\.\,]{3,35})', prompt, re.IGNORECASE)
    if client_m:
        cn = client_m.group(1).strip()
        cn = re.split(r'\b(?:and|vehicle|truck|driver|gstin|pan|email|phone|address|state|country|place|transport|discount|freight)\b', cn, flags=re.IGNORECASE)[0].strip()
        if cn and not any(bad in cn.lower() for bad in ["ship to", "bill to", "same as", "copy bill"]):
            pre_parsed["clientName"] = cn

    # 3. GSTIN / Tax ID Intent (e.g. "gstin 07AAAAA0000A1Z5", "gst no 27AAAAA0000A1Z5", "tax id 07AAAAA0000A1Z5")
    gst_m = re.search(r'(?:gstin|gst|gst no|gst number|tax id|gst code)\s*(?:is|=|:|\s)\s*([0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}[Zz][0-9A-Za-z]{1})', prompt, re.IGNORECASE)
    if gst_m:
        pre_parsed["clientGstin"] = gst_m.group(1).strip().upper()

    # 4. State & Country Intent
    state_m = re.search(r'(?:state|client state)\s*(?:is|=|:|\s)\s*([A-Za-z\s]{3,20})', prompt, re.IGNORECASE)
    if state_m:
        st_val = state_m.group(1).strip().split(',')[0].split()[0]
        if st_val.lower() not in ["same", "bill", "ship", "and"]:
            pre_parsed["clientState"] = st_val.capitalize()

    country_m = re.search(r'(?:country|client country)\s*(?:is|=|:|\s)\s*([A-Za-z\s]{3,20})', prompt, re.IGNORECASE)
    if country_m:
        co_val = country_m.group(1).strip().split(',')[0].split()[0]
        if co_val.lower() not in ["same", "bill", "ship", "and"]:
            pre_parsed["clientCountry"] = co_val.capitalize()

    # 5. Vehicle / Truck / Lorry Number Intent (e.g. "vehicle no DL14SV7995", "truck MH-12-AB-1234", "lorry 1234")
    v_match = re.search(r'(?:vehicle|truck|lorry|car|auto|vessel|reg)\s*(?:no\.?|number|num|id)?\s*(?:is|=|:|\s)?\s*([a-zA-Z0-9\-]{4,16})', prompt, re.IGNORECASE)
    if v_match:
        v_num = v_match.group(1).strip()
        if len(v_num) >= 4 and not any(stop in v_num.lower() for stop in ["same", "bill", "ship", "with", "from", "and"]):
            pre_parsed["vehicleNo"] = v_num.upper()

    # 6. Transport / Courier / Dispatch Intent
    t_match = re.search(r'(?:transport|transporter|courier|carrier|shipping mode|dispatch via|shipped via)\s*(?:is|=|:|\s)\s*([A-Za-z0-9\s]{3,25})', prompt, re.IGNORECASE)
    if t_match:
        t_val = t_match.group(1).strip().split('\n')[0].split(',')[0]
        t_val = re.split(r'\b(?:and|vehicle|truck|driver|station|eway|po|place)\b', t_val, flags=re.IGNORECASE)[0].strip()
        if t_val and not any(stop in t_val.lower() for stop in ["same", "bill", "ship"]):
            pre_parsed["transport"] = t_val

    # 7. Product Item Intent (e.g. "add product Laptop for 50000", "item Chair 1500")
    item_m = re.search(r'(?:add\s+)?(?:item|product|service)\s+([A-Za-z0-9\s]+?)\s+(?:for|at|rate|price|cost|=|:|\s)\s*(?:rs\.?|₹|\$)?\s*([\d,]+(?:\.\d+)?)', prompt, re.IGNORECASE)
    if item_m:
        p_name = item_m.group(1).strip()
        if p_name and not any(bad in p_name.lower() for bad in ["freight", "transport", "shipping", "discount"]):
            try:
                p_rate = float(item_m.group(2).replace(',', ''))
                pre_parsed["items"] = [{
                    "name": p_name.capitalize(),
                    "rate": p_rate,
                    "quantity": 1,
                    "taxPercentage": 18
                }]
            except ValueError:
                pass

    # 8. Place of Supply Intent
    pos_match = re.search(r'place of supply\s*(?:is|=|:|\s)\s*([A-Za-z\s]{3,25})', prompt, re.IGNORECASE)
    if pos_match:
        pos_val = pos_match.group(1).strip().split(',')[0]
        pos_val = re.split(r'\b(?:and|vehicle|driver|eway|po|transport)\b', pos_val, flags=re.IGNORECASE)[0].strip()
        pre_parsed["placeOfSupply"] = pos_val

    # 9. Terms & Conditions Intent
    terms_match = re.search(r'(?:terms|conditions)\s*(?:is|=|:|\s)\s*(.+)', prompt, re.IGNORECASE)
    if terms_match:
        pre_parsed["invoiceTerms"] = terms_match.group(1).strip()

    # 10. Notes Intent
    notes_match = re.search(r'(?:notes|note|comment|comments)\s*(?:is|=|:|\s)\s*(.+)', prompt, re.IGNORECASE)
    if notes_match:
        pre_parsed["notes"] = notes_match.group(1).strip()

    # 11. Transport / Freight / Delivery Charges Intent
    freight_match = re.search(r'(?:freight|transport|shipping|delivery)\s*(?:charge|charges|cost|fee|amount)?\s*(?:as|=|:|\s)?\s*(?:rs\.?|₹|\$)?\s*([\d,]+(?:\.\d+)?)', prompt, re.IGNORECASE)
    if freight_match:
        try:
            val = float(freight_match.group(1).replace(',', ''))
            pre_parsed["freightCharges"] = val
        except ValueError:
            pass

    # 12. Discount Intent
    disc_val = None
    disc_type = None
    m_a = re.search(r'(?:rs\.?|₹|\$)?\s*([\d,]+(?:\.\d+)?)\s*(%)?\s*(?:flat|percent|percentage)?\s*discount', prompt, re.IGNORECASE)
    if m_a:
        try:
            disc_val = float(m_a.group(1).replace(',', ''))
            disc_type = "percent" if m_a.group(2) or "%" in prompt or "percent" in prompt.lower() else "flat"
        except ValueError:
            pass
    
    if disc_val is None:
        m_b = re.search(r'discount\s*(?:of|=|:|\s)?\s*(?:rs\.?|₹|\$)?\s*([\d,]+(?:\.\d+)?)\s*(%)?', prompt, re.IGNORECASE)
        if m_b:
            try:
                disc_val = float(m_b.group(1).replace(',', ''))
                disc_type = "percent" if m_b.group(2) or "%" in prompt or "percent" in prompt.lower() else "flat"
            except ValueError:
                pass

    if disc_val is not None:
        pre_parsed["discountValue"] = disc_val
        pre_parsed["discountType"] = disc_type

    parsed_result = {}
    try:
        model_name = "gemini-2.5-flash-lite"
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=schema
                )
            )
            parsed_result = json.loads(response.text.strip()) if response.text else {}
        except Exception as api_err:
            print(f"Gemini {model_name} Error: {api_err}. Trying fallback model gemini-2.5-flash...")
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=schema
                    )
                )
                parsed_result = json.loads(response.text.strip()) if response.text else {}
            except Exception as fallback_err:
                print(f"Gemini fallback model Error: {fallback_err}")
                parsed_result = {}
    except Exception as e:
        print(f"AI Parse Invoice Error: {e}")
        parsed_result = {}

    final_result = {**parsed_result, **pre_parsed}

    # Sanitize clientName if Gemini inadvertently hallucinated command words as a name
    if "clientName" in final_result and final_result["clientName"]:
        c_name_lower = str(final_result["clientName"]).lower()
        if any(bad in c_name_lower for bad in ["ship to", "bill to", "same as", "copy bill", "copying", "details same"]):
            del final_result["clientName"]

    # Filter out items that are actually freight or discounts masquerading as line items
    if "items" in final_result and isinstance(final_result["items"], list):
        clean_items = []
        for it in final_result["items"]:
            it_name = str(it.get("name", "")).lower()
            if any(bad in it_name for bad in ["freight", "shipping charge", "delivery charge", "transport charge", "discount"]):
                if any(k in it_name for k in ["freight", "transport", "shipping", "delivery"]):
                    if "freightCharges" not in final_result or not final_result["freightCharges"]:
                        try:
                            final_result["freightCharges"] = float(it.get("rate", 0) or it.get("amount", 0))
                        except (ValueError, TypeError):
                            pass
                elif "discount" in it_name:
                    if "discountValue" not in final_result or not final_result["discountValue"]:
                        try:
                            final_result["discountValue"] = float(it.get("rate", 0) or it.get("amount", 0))
                            final_result["discountType"] = "flat"
                        except (ValueError, TypeError):
                            pass
                continue
            clean_items.append(it)
        final_result["items"] = clean_items

    return final_result
