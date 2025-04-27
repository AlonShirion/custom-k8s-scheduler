#!/bin/bash
# Test: Only pods with custom scheduler should be handled
source "$(dirname "$0")/utils.sh"

echo "TEST: mixed schedulers - only one pod should be handled"
reset_namespace
kubectl apply -f manifests/test-mixed-schedulers.yaml
sleep 5

wait_for_ready_pods 1 30
print_pods
