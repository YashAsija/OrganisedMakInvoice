import os
import sys
import requests
import json

def get_api_key():
    # Try getting from environment
    key = os.environ.get("PADDLE_API_KEY")
    if key:
        return key.strip()
    
    # Try reading from backend/.env
    try:
        if os.path.exists("backend/.env"):
            with open("backend/.env", "r") as f:
                for line in f:
                    if line.startswith("PADDLE_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
        
    # Prompt the user
    print("Paddle Sandbox API Key not found in environment or backend/.env.")
    key = input("Please enter your Paddle Sandbox API Key (starts with pv_): ").strip()
    if not key:
        print("Error: API Key is required.")
        sys.exit(1)
    return key

def create_product(api_key, name, description):
    url = "https://sandbox-api.paddle.com/products"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "name": name,
        "tax_category": "standard",
        "description": description
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code not in (200, 201):
        print(f"Failed to create product '{name}': {response.status_code} - {response.text}")
        response.raise_for_status()
    data = response.json()
    product_id = data["data"]["id"]
    print(f"Created Product '{name}': {product_id}")
    return product_id

def create_price(api_key, product_id, name, interval, amount_usd, amount_gbp, amount_eur, amount_aud):
    url = "https://sandbox-api.paddle.com/prices"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "product_id": product_id,
        "description": f"{name} {interval.capitalize()}ly",
        "billing_cycle": {
            "interval": interval,
            "frequency": 1
        },
        "trial_period": {
            "interval": "day",
            "frequency": 7
        },
        "unit_price": {
            "amount": amount_usd,
            "currency_code": "USD"
        },
        "unit_price_overrides": [
            {
                "country_codes": ["GB"],
                "unit_price": {
                    "amount": amount_gbp,
                    "currency_code": "GBP"
                }
            },
            {
                "country_codes": ["IE"],
                "unit_price": {
                    "amount": amount_eur,
                    "currency_code": "EUR"
                }
            },
            {
                "country_codes": ["AU"],
                "unit_price": {
                    "amount": amount_aud,
                    "currency_code": "AUD"
                }
            }
        ]
    }
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code not in (200, 201):
        print(f"Failed to create price for product '{product_id}': {response.status_code} - {response.text}")
        response.raise_for_status()
    data = response.json()
    price_id = data["data"]["id"]
    print(f"Created Price for '{name}' ({interval}): {price_id}")
    return price_id

def main():
    api_key = get_api_key()
    
    plans = [
        {
            "name": "Starter",
            "desc": "Starter Plan",
            "monthly": {
                "usd": "500",
                "gbp": "400",
                "eur": "450",
                "aud": "700"
            },
            "annual": {
                "usd": "5000",
                "gbp": "4000",
                "eur": "4500",
                "aud": "7000"
            }
        },
        {
            "name": "Pro",
            "desc": "Pro Plan",
            "monthly": {
                "usd": "1000",
                "gbp": "800",
                "eur": "900",
                "aud": "1400"
            },
            "annual": {
                "usd": "10000",
                "gbp": "8000",
                "eur": "9000",
                "aud": "14000"
            }
        },
        {
            "name": "Advanced",
            "desc": "Advanced Plan",
            "monthly": {
                "usd": "2000",
                "gbp": "1600",
                "eur": "1800",
                "aud": "2800"
            },
            "annual": {
                "usd": "20000",
                "gbp": "16000",
                "eur": "18000",
                "aud": "28000"
            }
        }
    ]
    
    catalog_mapping = []
    
    for plan in plans:
        print(f"\nProcessing plan: {plan['name']}")
        try:
            prod_id = create_product(api_key, plan["name"], plan["desc"])
            
            # Monthly price
            m_price_id = create_price(
                api_key, prod_id, plan["name"], "month",
                plan["monthly"]["usd"], plan["monthly"]["gbp"],
                plan["monthly"]["eur"], plan["monthly"]["aud"]
            )
            
            # Annual price
            a_price_id = create_price(
                api_key, prod_id, plan["name"], "year",
                plan["annual"]["usd"], plan["annual"]["gbp"],
                plan["annual"]["eur"], plan["annual"]["aud"]
            )
            
            catalog_mapping.append({
                "product_name": plan["name"],
                "product_id": prod_id,
                "monthly_price_id": m_price_id,
                "annual_price_id": a_price_id
            })
        except Exception as e:
            print(f"Error processing plan '{plan['name']}': {e}")
            
    # Output the result as JSON to read in agent
    print("\n--- CATALOG CREATION SUCCESSFUL ---")
    print(json.dumps(catalog_mapping, indent=2))

if __name__ == "__main__":
    main()
