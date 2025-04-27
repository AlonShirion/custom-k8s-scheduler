#!/bin/bash
source "$(dirname "$0")/utils.sh"

echo "TEST: basic gang job scheduling (3 pods)"
reset_namespace
kubectl apply -f manifests/test-gang-job.yaml

wait_for_running_pods 3
print_pods
