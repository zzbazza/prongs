#!/bin/bash

# Script to generate DZI tiles from PDFs in content/files/Tabule
# Creates Deep Zoom Images for OpenSeadragon viewer

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for statistics
total_pdfs=0
created_dzi=0
skipped_dzi=0
errors=0

# Source directory
SOURCE_DIR="content/files/Tabule"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DZI Tile Generator for Panels${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Searching in: $SOURCE_DIR"
echo ""

# Check if vips is available
if ! command -v vips &> /dev/null; then
    echo -e "${RED}✗${NC} Error: vips (libvips) not found!"
    echo ""
    echo "Please install libvips:"
    echo "  macOS:  brew install vips"
    echo "  Ubuntu: sudo apt install libvips-tools"
    echo ""
    exit 1
fi

# Check if pdftoppm is available
if ! command -v pdftoppm &> /dev/null; then
    echo -e "${RED}✗${NC} Error: pdftoppm not found!"
    echo ""
    echo "Please install poppler-utils:"
    echo "  macOS:  brew install poppler"
    echo "  Ubuntu: sudo apt install poppler-utils"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Using vips version: $(vips --version | head -n1)"
echo -e "${GREEN}✓${NC} Using pdftoppm from poppler"
echo ""
echo -e "${BLUE}Starting DZI generation...${NC}"
echo ""

# Function to process a single PDF
process_pdf() {
    local pdf_path="$1"
    local pdf_dir=$(dirname "$pdf_path")
    local pdf_name=$(basename "$pdf_path" .pdf)
    local dzi_path="$pdf_dir/${pdf_name}.dzi"
    local png_temp="$pdf_dir/${pdf_name}_page-1.png"
    local tif_temp="$pdf_dir/${pdf_name}_page-1.tif"

    ((total_pdfs++))

    # Check if DZI already exists
    if [ -f "$dzi_path" ]; then
        echo -e "${YELLOW}⊙${NC} Skipping (exists): $pdf_name.dzi"
        ((skipped_dzi++))
        return 0
    fi

    echo -e "${BLUE}→${NC} Processing: $pdf_name.pdf"

    # Step 1: Convert PDF to PNG using pdftoppm (first page only)
    echo "  - Converting PDF to PNG (300 DPI)..."
    pdftoppm -png -r 300 -f 1 -l 1 "$pdf_path" "$pdf_dir/${pdf_name}_page" 2>/dev/null

    if [ ! -f "$png_temp" ]; then
        echo -e "${RED}✗${NC} Failed to create PNG: $pdf_name"
        ((errors++))
        return 1
    fi

    # Step 2: Convert PNG to TIFF using vips
    echo "  - Converting PNG to TIFF..."
    vips copy "$png_temp" "$tif_temp" 2>/dev/null

    if [ ! -f "$tif_temp" ]; then
        echo -e "${RED}✗${NC} Failed to create TIFF: $pdf_name"
        ((errors++))
        rm -f "$png_temp"
        return 1
    fi

    # Step 3: Generate DZI tiles using vips
    echo "  - Generating DZI tiles (JPEG Q=95)..."
    vips dzsave "$tif_temp" "$pdf_dir/${pdf_name}" \
        --suffix ".jpg[Q=95]" \
        --overlap 0 2>/dev/null

    if [ $? -eq 0 ] && [ -f "$dzi_path" ]; then
        echo -e "${GREEN}✓${NC} Created: $pdf_name.dzi"
        ((created_dzi++))

        # Clean up temporary files
        rm -f "$png_temp" "$tif_temp"
    else
        echo -e "${RED}✗${NC} Failed to generate DZI: $pdf_name"
        ((errors++))
        rm -f "$png_temp" "$tif_temp"
        return 1
    fi
}

# Find all PDFs directly in the Tabule folder (not in subdirectories)
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}✗${NC} Directory not found: $SOURCE_DIR"
    exit 1
fi

# Process PDFs only in the immediate directory (maxdepth 1)
while IFS= read -r -d '' pdf_file; do
    process_pdf "$pdf_file"
done < <(find "$SOURCE_DIR" -maxdepth 1 -type f -name "*.pdf" -print0)

# Print statistics
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Total PDFs found:        $total_pdfs"
echo -e "${GREEN}DZI tiles created:       $created_dzi${NC}"
echo -e "${YELLOW}DZI tiles skipped:       $skipped_dzi${NC}"
if [ $errors -gt 0 ]; then
    echo -e "${RED}Errors:                  $errors${NC}"
else
    echo -e "${GREEN}Errors:                  0${NC}"
fi
echo ""

if [ $errors -gt 0 ]; then
    exit 1
else
    echo -e "${GREEN}✓ Done!${NC}"
    exit 0
fi
