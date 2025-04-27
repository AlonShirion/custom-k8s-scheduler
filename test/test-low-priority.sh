#!/bin/bash
source "$(dirname "$0")/utils.sh"

echo "TEST: low priority pods scheduled on separate nodes"
reset_namespace
kubectl apply -f manifests/test-low-priority.yaml

wait_for_running_pods 3
print_pods
