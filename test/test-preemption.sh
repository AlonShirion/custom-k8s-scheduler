#!/bin/bash
source "$(dirname "$0")/utils.sh"

echo "TEST: high priority pod preempts low-priority pods"
reset_namespace
kubectl apply -f manifests/test-low-priority.yaml
sleep 10
kubectl apply -f manifests/test-high-priority.yaml
sleep 10

wait_for_running_pods 3
print_pods
