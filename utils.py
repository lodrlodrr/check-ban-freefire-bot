import aiohttp
import os
from dotenv import load_dotenv
import datetime

load_dotenv()

# Define all Free Fire regions
FREEFIRE_REGIONS = [
    "ind",  # India
    "br",   # Brazil
    "sg",   # Singapore
    "ru",   # Russia
    "id",   # Indonesia
    "tw",   # Taiwan
    "us",   # United States
    "vn",   # Vietnam
    "th",   # Thailand
    "me",   # Middle East
    "pk",   # Pakistan
    "cis",  # CIS
    "bd"    # Bangladesh
]

# Helper function to convert timestamp to readable date
def format_timestamp(timestamp):
    try:
        if timestamp != "N/A" and timestamp:
            # Convert timestamp to datetime
            dt = datetime.datetime.fromtimestamp(int(timestamp))
            return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        pass
    return "N/A"

async def check_ban(uid):
    # Try each region until we get a valid response
    for region in FREEFIRE_REGIONS:
        # Use the new API endpoint
        api_url = f"https://info-ob49.vercel.app/api/account/?uid={uid}&region={region}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url) as response:
                    print(f"API Request URL: {response.url}")
                    print(f"API Response Status: {response.status}")
                    
                    if response.status == 200:
                        response_data = await response.json()
                        print(f"API Response Data: {response_data}")
                        
                        # Handle the new API response format
                        if "basicInfo" in response_data:
                            # This is the format we saw in the example
                            basic_info = response_data["basicInfo"]
                            
                            # Get account information
                            nickname = basic_info.get("nickname", "Unknown")
                            created_at = basic_info.get("createAt", "N/A")
                            last_login = basic_info.get("lastLoginAt", "N/A")
                            
                            # Format timestamps to readable dates
                            created_at_formatted = format_timestamp(created_at)
                            last_login_formatted = format_timestamp(last_login)
                            
                            # Extract region from basic info
                            region_from_api = basic_info.get("region", region)
                            
                            # Since there's no explicit ban information, assume not banned
                            return {
                                "is_banned": 0,
                                "nickname": nickname,
                                "period": 0,
                                "region": region_from_api,
                                "created_at": created_at_formatted,
                                "last_login": last_login_formatted
                            }
                    elif response.status == 404:
                        # Continue to next region
                        print(f"Account not found in region {region}, trying next region...")
                        continue
                    elif response.status == 500:
                        # API server error - continue to next region
                        print(f"API server error for region {region}, trying next region...")
                        continue
                    else:
                        # For other errors, continue to next region
                        print(f"Error {response.status} for region {region}, trying next region...")
                        continue
                        
        except Exception as e:
            print(f"An error occurred for region {region}: {e}")
            continue
    
    # If we've tried all regions and none worked
    return {"error": "ACCOUNT_NOT_FOUND", "message": "Account not found in any region"}