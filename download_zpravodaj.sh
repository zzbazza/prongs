#!/bin/bash
# Script to download zpravodaj files from starabela.ostrava.cz

BASE_URL="https://starabela.ostrava.cz"
OUTPUT_DIR="zpravodaj"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "=================================================="
echo "Zpravodaj Downloader"
echo "=================================================="

# Years to process
for year in {2006..2025}; do
    echo ""
    echo "=================================================="
    echo "Processing year: $year"
    echo "=================================================="

    # Create year folder
    year_folder="$OUTPUT_DIR/$year"
    mkdir -p "$year_folder"

    # Get the year page
    year_url="$BASE_URL/cs/o-stare-bele/zpravodaj/zpravodaj-$year"
    temp_html="$year_folder/_temp_page.html"

    echo "Fetching: $year_url"
    curl -s "$year_url" > "$temp_html"

    if [ ! -s "$temp_html" ]; then
        echo "  ✗ Failed to fetch page for year $year"
        rm -f "$temp_html"
        continue
    fi

    # Extract PDF links using grep and sed
    # Look for hrefs ending in .pdf or containing /download/
    grep -o 'href="[^"]*\.pdf[^"]*"' "$temp_html" | sed 's/href="//;s/"//' > "$year_folder/_links.txt"
    grep -o 'href="[^"]*download[^"]*"' "$temp_html" | sed 's/href="//;s/"//' >> "$year_folder/_links.txt"

    # Also look for links in data-href or similar attributes
    grep -o 'data-href="[^"]*\.pdf[^"]*"' "$temp_html" | sed 's/data-href="//;s/"//' >> "$year_folder/_links.txt"

    # Remove duplicates
    sort -u "$year_folder/_links.txt" > "$year_folder/_links_unique.txt"

    # Count links found
    link_count=$(wc -l < "$year_folder/_links_unique.txt" | tr -d ' ')
    echo "  Found $link_count potential file(s)"

    if [ "$link_count" -eq 0 ]; then
        echo "  No files found for year $year"
        rm -f "$temp_html" "$year_folder/_links.txt" "$year_folder/_links_unique.txt"
        continue
    fi

    # Download each file
    counter=1
    while IFS= read -r link; do
        # Make absolute URL if needed
        if [[ "$link" == http* ]]; then
            full_url="$link"
        else
            full_url="$BASE_URL$link"
        fi

        # Extract filename from URL
        filename=$(basename "$link" | sed 's/?.*$//')

        # If no good filename, create one
        if [ -z "$filename" ] || [ "$filename" = "download" ]; then
            filename="zpravodaj_${year}_${counter}.pdf"
        fi

        output_path="$year_folder/$filename"

        # Skip if already exists
        if [ -f "$output_path" ]; then
            echo "  ⊘ Already exists: $filename"
        else
            echo "  Downloading: $full_url"
            if curl -L -s -o "$output_path" "$full_url"; then
                file_size=$(stat -f%z "$output_path" 2>/dev/null || stat -c%s "$output_path" 2>/dev/null)
                if [ "$file_size" -gt 1000 ]; then
                    echo "  ✓ Saved: $filename (${file_size} bytes)"
                else
                    echo "  ✗ File too small (likely error), removing"
                    rm -f "$output_path"
                fi
            else
                echo "  ✗ Failed to download"
            fi
            sleep 0.5
        fi

        counter=$((counter + 1))
    done < "$year_folder/_links_unique.txt"

    # Clean up temp files
    rm -f "$temp_html" "$year_folder/_links.txt" "$year_folder/_links_unique.txt"
done

echo ""
echo "=================================================="
echo "Download complete!"
echo "Files saved to: $(pwd)/$OUTPUT_DIR"
echo "=================================================="
