#!/bin/bash
source "$(dirname "$0")/utils.sh"

echo "TEST: gang job preempts low-priority pods"
reset_namespace
kubectl apply -f manifests/test-low-priority.yaml
sleep 10
kubectl apply -f manifests/test-gang-job.yaml
sleep 10

wait_for_running_pods 3
print_pods
