# Custom Kubernetes Secondary Scheduler

This project implements a custom Kubernetes scheduler with support for:

- Pod priority-based scheduling
- Gang scheduling (all pods in a job are scheduled together or none at all)
- Preemption (evict lower-priority pods if needed)
- Gang-aware preemption (evict entire gangs to make space for higher-priority ones)

> ✨ Tested locally with Minikube and WSL2 on Ubuntu

---

## 📚 Prerequisites

### 1. Install WSL2 + Ubuntu
Follow the [official Microsoft WSL2 guide](https://learn.microsoft.com/en-us/windows/wsl/install) to install Ubuntu on your machine.

### 2. Install Node.js using NVM
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
```

### 3. Install Minikube & Kubernetes CLI (kubectl)
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

---

## ⚙️ Cluster Setup

Start a multi-node Minikube cluster:
```bash
minikube start --nodes 3 --driver=docker
```

Check node readiness:
```bash
kubectl get nodes
```

---

## 🔧 Running the Scheduler

1. Clone the repository:
```bash
git clone https://github.com/AlonShirion/custom-k8s-scheduler.git
cd custom-k8s-scheduler
```

2. Create a `.env` file in the root directory:
```env
SCHEDULER_NAME=custom-scheduler
NAMESPACE_NAME=custom-scheduler-ns

CLUSTER_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_CERT=$(kubectl config view --raw --minify -o jsonpath='{.users[0].user.client-certificate}')
CLUSTER_KEY=$(kubectl config view --raw --minify -o jsonpath='{.users[0].user.client-key}')
```
> ⚠️ Do **not** hardcode paths. Use the shell commands above to extract the correct values for your environment.

3. Use correct Node version:
```bash
nvm use
```

4. Install dependencies:
```bash
npm install
```

5. Start the scheduler:
```bash
node scheduler/main.js
```

You should see logs like:
```
Watching for pending pods
Detected unscheduled pod: high-priority-pod
Scheduled pod 'high-priority-pod' to node 'minikube'
```

---

## 🔮 Running Tests

1. Make all test files executable:
```bash
chmod +x test/*.sh
```

2. Run all tests sequentially:
```bash
./test/run-all.sh
```

3. Or run a single test:
```bash
bash test/test-low-priority.sh
```

> Tests will create pods, monitor scheduling decisions, and print pass/fail status.

---

## 🗓 Test Descriptions

| **Test File**                     | **Description**                                                                 |
|----------------------------------|---------------------------------------------------------------------------------|
| `test-low-priority.sh`           | Schedules 3 low-priority pods across 3 nodes                                   |
| `test-preemption.sh`            | Schedules a high-priority pod and checks that it preempts a lower-priority pod |
| `test-gang-job.sh`               | Tests scheduling of a gang job with 3 pods; all should run together            |
| `test-gang-preemption.sh`        | Gang job evicts lower-priority pods before being scheduled                     |
| `test-gang-of-one.sh`            | Edge case: a gang job with only 1 pod                                          |
| `test-parallel-low-priority.sh`  | Bursts 10 low-priority pods; expects 3 scheduled                               |
| `test-preempted-pods-retry.sh`   | Tests retrying of scheduling after preemption occurs                           |
| `test-overcapacity-gang.sh`      | Schedules a gang job larger than cluster capacity; should fail to schedule     |
| `test-invalid-priority.sh`       | Schedules a pod with no priority annotation; should default to 0               |
| `test-mixed-schedulers.sh`       | Verifies that default scheduler pods are ignored and custom scheduler pods run |

