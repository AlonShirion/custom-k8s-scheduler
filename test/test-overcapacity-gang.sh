#!/bin/bash
# Test: Gang job with more pods than nodes should not schedule
source "$(dirname "$0")/utils.sh"

echo "TEST: overcapacity gang job should fail to schedule"
reset_namespace
kubectl apply -f manifests/test-overcapacity-gang.yaml

wait_for_ready_pods 0 30
print_pods
