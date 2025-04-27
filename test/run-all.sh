#!/bin/bash

TEST_DIR="$(dirname "$0")"
DELAY=5  # seconds to wait between tests

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

TOTAL=0
PASSED=0
FAILED=0

echo -e "${YELLOW}Running all scheduler tests from $TEST_DIR${NC}"

for script in "$TEST_DIR"/test-*.sh; do
  ((TOTAL++))
  echo "--------------------------------------------"
  echo "Running: $script"
  echo "--------------------------------------------"
  if bash "$script"; then
    echo -e "${GREEN}Result: PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}Result: FAILED${NC}"
    ((FAILED++))
  fi
  echo "Finished: $script"
  echo "Waiting $DELAY seconds before next test..."
  sleep $DELAY
done

echo "--------------------------------------------"
echo -e "${YELLOW}Test Summary:${NC}"
echo "Total:  $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}All tests passed successfully.${NC}"
else
  echo -e "${RED}$FAILED test(s) failed.${NC}"
  exit 1
fi
