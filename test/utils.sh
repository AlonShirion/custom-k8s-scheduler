#!/bin/bash
set -euo pipefail

NAMESPACE="custom-scheduler-ns"

function reset_namespace() {
  echo "Resetting test state..."
  kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force >/dev/null 2>&1 || true
  kubectl delete jobs --all -n $NAMESPACE --grace-period=0 --force >/dev/null 2>&1 || true
  sleep 2
}

wait_for_ready_pods() {
  expected_count=$1
  timeout=${2:-45}
  elapsed=0

  echo "Waiting up to $timeout seconds for $expected_count pod(s) to reach Running or Pending..."

  while [[ $elapsed -lt $timeout ]]; do
    ready_count=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | grep -cE 'Running|Pending' || true)
    echo "[${elapsed}/${timeout}s] Total: $ready_count"
    if [[ $ready_count -ge $expected_count ]]; then
      echo "At least $expected_count pod(s) are scheduled."
      return 0
    fi
    sleep 1
    ((elapsed++))
  done

  echo "Timeout waiting for $expected_count pods to reach Running or Pending"
  return 1
}

function wait_for_running_pods() {
  local expected=$1
  local timeout=${2:-60}

  echo "Waiting up to ${timeout}s for $expected pod(s) to be in Running state..."

  for ((i=1; i<=timeout; i++)); do
    local running=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers | wc -l)

    echo "  [$i/${timeout}s] Running: $running / $expected"

    if [[ "$running" -ge "$expected" ]]; then
      echo "All $expected pod(s) are running."
      return 0
    fi

    sleep 1
  done

  echo "Timeout waiting for $expected pods to be Running"
  kubectl get pods -n $NAMESPACE -o wide
  return 1
}



function print_pods() {
  echo "Pods:"
  kubectl get pods -n $NAMESPACE -o wide
}
