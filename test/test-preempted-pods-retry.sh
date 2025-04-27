#!/bin/bash
# Test: pods that were preempted try to schedule again later
source "$(dirname "$0")/utils.sh"

echo "TEST: preempted pods retry scheduling"
reset_namespace
kubectl apply -f manifests/test-low-priority.yaml
sleep 5
kubectl apply -f manifests/test-gang-job.yaml
sleep 10
kubectl apply -f manifests/test-low-priority.yaml

wait_for_ready_pods 6 60
print_pods
