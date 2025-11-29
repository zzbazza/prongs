#!/bin/bash

# Script to generate thumbnails for all images in content/configs
# Thumbnails are created in a 'thumbnails' subdirectory relative to each image

# Thumbnail dimensions
THUMB_WIDTH=400
THUMB_HEIGHT=400

# Supported image extensions (case-insensitive)
IMAGE_EXTENSIONS=("jpg" "jpeg" "png" "gif" "bmp" "webp" "tiff" "tif")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for statistics
total_images=0
created_thumbnails=0
skipped_thumbnails=0
errors=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Thumbnail Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Thumbnail size: ${THUMB_WIDTH}x${THUMB_HEIGHT}px"
echo "Searching in: content/files"
echo ""

# Check if ImageMagick or sips is available
if command -v convert &> /dev/null; then
    TOOL="imagemagick"
    echo -e "${GREEN}✓${NC} Using ImageMagick (convert)"
elif command -v sips &> /dev/null; then
    TOOL="sips"
    echo -e "${GREEN}✓${NC} Using macOS sips"
else
    echo -e "${RED}✗${NC} Error: Neither ImageMagick nor sips found!"
    echo "Please install ImageMagick: brew install imagemagick"
    exit 1
fi

echo ""
echo -e "${BLUE}Starting thumbnail generation...${NC}"
echo ""

# Function to check if file is an image
is_image() {
    local file="$1"
    local ext="${file##*.}"
    ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

    for valid_ext in "${IMAGE_EXTENSIONS[@]}"; do
        if [ "$ext" = "$valid_ext" ]; then
            return 0
        fi
    done
    return 1
}

# Function to create thumbnail using ImageMagick
create_thumbnail_imagemagick() {
    local source="$1"
    local dest="$2"

    convert "$source" -thumbnail "${THUMB_WIDTH}x${THUMB_HEIGHT}>" -quality 85 "$dest" 2>/dev/null
    return $?
}

# Function to create thumbnail using sips (macOS)
create_thumbnail_sips() {
    local source="$1"
    local dest="$2"

    # Copy file first, then resize in place
    cp "$source" "$dest" 2>/dev/null || return 1
    sips -Z $THUMB_WIDTH "$dest" --out "$dest" &>/dev/null
    return $?
}

# Function to process a single image
process_image() {
    local image_path="$1"
    local image_dir=$(dirname "$image_path")
    local image_name=$(basename "$image_path")
    local thumb_dir="$image_dir/thumbnails"
    local thumb_path="$thumb_dir/$image_name"

    ((total_images++))

    # Check if thumbnail already exists
    if [ -f "$thumb_path" ]; then
#        echo -e "${YELLOW}⊙${NC} Skipping (exists): $image_path"
        ((skipped_thumbnails++))
        return 0
    fi

    # Create thumbnails directory if it doesn't exist
    if [ ! -d "$thumb_dir" ]; then
        mkdir -p "$thumb_dir"
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗${NC} Failed to create directory: $thumb_dir"
            ((errors++))
            return 1
        fi
    fi

    # Create thumbnail
    if [ "$TOOL" = "imagemagick" ]; then
        create_thumbnail_imagemagick "$image_path" "$thumb_path"
    else
        create_thumbnail_sips "$image_path" "$thumb_path"
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Created: $thumb_path"
        ((created_thumbnails++))
    else
        echo -e "${RED}✗${NC} Failed: $image_path"
        ((errors++))
    fi
}

# Find and process all images
while IFS= read -r -d '' image_path; do
    if is_image "$image_path"; then
        process_image "$image_path"
    fi
done < <(find content/files -type f -print0)

# Print statistics
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Total images found:      $total_images"
echo -e "${GREEN}Thumbnails created:      $created_thumbnails${NC}"
echo -e "${YELLOW}Thumbnails skipped:      $skipped_thumbnails${NC}"
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
