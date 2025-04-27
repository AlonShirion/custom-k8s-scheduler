#!/bin/bash
source "$(dirname "$0")/utils.sh"

echo "TEST: gang of one pod job"
reset_namespace
kubectl apply -f manifests/test-gang-one.yaml

wait_for_running_pods 1
print_pods
