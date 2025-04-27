#!/bin/bash
# Test: many low-priority pods competing for limited nodes
source "$(dirname "$0")/utils.sh"

echo "TEST: parallel low priority pods"
reset_namespace
kubectl apply -f manifests/test-parallel-low-priority.yaml

wait_for_running_pods 3 60
print_pods
