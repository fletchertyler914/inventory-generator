#!/bin/bash

# Tail CaseSpace application logs
# Usage: ./tail-logs.sh [options]
# Options:
#   -f, --follow    Follow log file (default)
#   -n, --lines N   Show last N lines (default: 50)
#   -e, --errors    Filter to show only errors
#   -w, --watch     Watch mode with timestamps
#   -h, --help      Show this help message

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
FOLLOW=true
LINES=50
ERRORS_ONLY=false
WATCH_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--follow)
      FOLLOW=true
      shift
      ;;
    -n|--lines)
      LINES="$2"
      FOLLOW=false
      shift 2
      ;;
    -e|--errors)
      ERRORS_ONLY=true
      shift
      ;;
    -w|--watch)
      WATCH_MODE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -f, --follow       Follow log file in real-time (default)"
      echo "  -n, --lines N      Show last N lines and exit (default: 50)"
      echo "  -e, --errors       Filter to show only errors"
      echo "  -w, --watch        Watch mode with colored output"
      echo "  -h, --help         Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                 # Follow logs in real-time"
      echo "  $0 -n 100          # Show last 100 lines"
      echo "  $0 -e              # Show only errors"
      echo "  $0 -w              # Watch mode with colors"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Determine log file path based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  LOG_DIR="$HOME/Library/Logs/com.casespace"
  LOG_FILE="$LOG_DIR/casespace.log"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  LOG_DIR="$HOME/.local/share/com.casespace/logs"
  LOG_FILE="$LOG_DIR/casespace.log"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  # Windows (Git Bash/Cygwin)
  LOG_DIR="$LOCALAPPDATA/com.casespace/logs"
  LOG_FILE="$LOG_DIR/casespace.log"
else
  echo "Unsupported OS: $OSTYPE"
  exit 1
fi

# Check if log file exists
if [[ ! -f "$LOG_FILE" ]]; then
  echo -e "${YELLOW}Warning:${NC} Log file not found at: $LOG_FILE"
  echo "Waiting for log file to be created..."
  echo "Start the application to create the log file."
  echo ""
  
  # Wait for file to be created (with timeout)
  TIMEOUT=30
  ELAPSED=0
  while [[ ! -f "$LOG_FILE" && $ELAPSED -lt $TIMEOUT ]]; do
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    echo -ne "\rWaiting... (${ELAPSED}s/${TIMEOUT}s)"
  done
  echo ""
  
  if [[ ! -f "$LOG_FILE" ]]; then
    echo -e "${RED}Error:${NC} Log file was not created within ${TIMEOUT} seconds"
    echo "Make sure the application is running."
    exit 1
  fi
fi

echo -e "${CYAN}CaseSpace Log Viewer${NC}"
echo -e "Log file: ${BLUE}$LOG_FILE${NC}"
echo -e "File size: ${GREEN}$(du -h "$LOG_FILE" | cut -f1)${NC}"
echo ""

# Colorize log output function
colorize_log() {
  while IFS= read -r line; do
    if [[ "$line" =~ \[ERROR\]|\[error\]|error|Error|ERROR|Failed|failed|FAILED ]]; then
      echo -e "${RED}$line${NC}"
    elif [[ "$line" =~ \[WARN\]|\[warn\]|Warning|warning|WARNING ]]; then
      echo -e "${YELLOW}$line${NC}"
    elif [[ "$line" =~ \[INFO\]|\[info\]|Info|INFO ]]; then
      echo -e "${GREEN}$line${NC}"
    elif [[ "$line" =~ \[Frontend\] ]]; then
      echo -e "${CYAN}$line${NC}"
    elif [[ "$line" =~ \[DEBUG\]|\[debug\]|Debug|DEBUG ]]; then
      echo -e "${BLUE}$line${NC}"
    else
      echo "$line"
    fi
  done
}

# Filter errors function
filter_errors() {
  grep -i -E "error|failed|exception|panic|\[Frontend\].*error" || true
}

# Main logic
if [[ "$ERRORS_ONLY" == true ]]; then
  if [[ "$FOLLOW" == true ]]; then
    echo -e "${YELLOW}Showing only errors (press Ctrl+C to exit)${NC}"
    echo ""
    tail -f "$LOG_FILE" | filter_errors | colorize_log
  else
    tail -n "$LINES" "$LOG_FILE" | filter_errors | colorize_log
  fi
elif [[ "$WATCH_MODE" == true ]]; then
  echo -e "${YELLOW}Watch mode enabled (press Ctrl+C to exit)${NC}"
  echo ""
  if [[ "$FOLLOW" == true ]]; then
    tail -f "$LOG_FILE" | colorize_log
  else
    tail -n "$LINES" "$LOG_FILE" | colorize_log
  fi
else
  if [[ "$FOLLOW" == true ]]; then
    echo -e "${YELLOW}Following log file (press Ctrl+C to exit)${NC}"
    echo ""
    tail -f "$LOG_FILE"
  else
    tail -n "$LINES" "$LOG_FILE"
  fi
fi

