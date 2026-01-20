#!/usr/bin/env bash

set -e  # Exit on error

ENV_FILE=".env"
TARGET_ENV="production"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Loading environment variables from ${ENV_FILE}...${NC}"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE file not found!"
    exit 1
fi

# Read .env file and process each line
while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    # Extract key and value
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        
        # Remove quotes if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        echo -e "${GREEN}Processing ${key} for Vercel ${TARGET_ENV} environment...${NC}"
        
        # Try to remove existing variable (ignore errors if it doesn't exist)
        vercel env rm "$key" "$TARGET_ENV" --yes 2>/dev/null || true
        
        # Add to Vercel
        vercel env add "$key" "$TARGET_ENV" <<EOF
$value
EOF
        
    fi
done < "$ENV_FILE"

echo -e "${GREEN}Done! All environment variables have been added.${NC}"
echo -e "${BLUE}Now deploy with: vercel --prod${NC}"