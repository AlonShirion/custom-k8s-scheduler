#!/bin/bash
# Test: Pod with no priority annotation should default to priority 0
source "$(dirname "$0")/utils.sh"

echo "TEST: pod with no priority annotation"
reset_namespace
kubectl apply -f manifests/test-invalid-priority.yaml
sleep 5

wait_for_ready_pods 1 30
print_pods
