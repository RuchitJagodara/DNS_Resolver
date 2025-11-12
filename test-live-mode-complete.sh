#!/bin/bash

# Complete Live Mode Test Script
# Tests the entire DNS Resolution Simulator with Live Mode

echo "================================================"
echo "DNS SIMULATOR - LIVE MODE COMPREHENSIVE TEST"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name=$1
    local domain=$2
    local record_type=$3
    
    echo -e "${YELLOW}Test: $test_name${NC}"
    echo "Domain: $domain, Record Type: $record_type"
    
    response=$(curl -s -X POST http://localhost:5001/api/resolve \
        -H "Content-Type: application/json" \
        -d "{\"domain\": \"$domain\", \"recordType\": \"$record_type\", \"mode\": \"live\", \"config\": {\"queryMode\": \"live\"}}")
    
    # Check if response is valid JSON
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        success=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))")
        
        if [ "$success" = "True" ]; then
            steps=$(echo "$response" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('steps', [])))")
            has_live_data=$(echo "$response" | python3 -c "import sys, json; print('liveData' in json.load(sys.stdin))")
            has_raw_output=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print('rawOutput' in data.get('liveData', {}))")
            
            echo -e "${GREEN}✓ PASSED${NC}"
            echo "  - Total Steps: $steps"
            echo "  - Has Live Data: $has_live_data"
            echo "  - Has Raw Output: $has_raw_output"
            
            # Show DNSSEC info if available
            dnssec_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); steps=[s for s in data.get('steps', []) if s.get('hasDNSSEC')]; print(len(steps))")
            if [ "$dnssec_count" -gt 0 ]; then
                echo "  - DNSSEC Records: $dnssec_count stages"
            fi
            
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo "  Error: $(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown error'))")"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Invalid JSON response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 3

# Run tests
echo "Running Live Mode Tests..."
echo ""

run_test "Google A Record" "google.com" "A"
run_test "Example.com A Record" "example.com" "A"
run_test "GitHub A Record" "github.com" "A"
run_test "Mozilla MX Record" "mozilla.org" "MX"

# Summary
echo "================================================"
echo "TEST SUMMARY"
echo "================================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "Live Mode is working correctly!"
    echo "You can now access the simulator at: http://localhost:3000"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo "Please check the errors above."
    exit 1
fi
