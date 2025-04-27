require('dotenv').config();
const k8s = require('@kubernetes/client-node');

const SCHEDULER_NAME = process.env.SCHEDULER_NAME;
const NAMESPACE_NAME = process.env.NAMESPACE_NAME;

const kc = new k8s.KubeConfig();
kc.loadFromOptions({
  clusters: [
    {
      name: 'minikube',
      server: process.env.CLUSTER_SERVER,
      skipTLSVerify: true,
    },
  ],
  users: [
    {
      name: 'minikube',
      certFile: process.env.CLUSTER_CERT,
      keyFile: process.env.CLUSTER_KEY,
    },
  ],
  contexts: [
    {
      name: 'minikube',
      user: 'minikube',
      cluster: 'minikube',
      namespace: NAMESPACE_NAME,
    },
  ],
  currentContext: 'minikube',
});

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const watch = new k8s.Watch(kc);

function shouldSchedule(pod) {
  return pod.spec.schedulerName === SCHEDULER_NAME && !pod.spec.nodeName;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bindPodToNode(pod, node, timeout = 0) {
  if (timeout > 0) {
    console.log(`Delaying bind of '${pod.metadata.name}' to '${node.metadata.name}' by ${timeout}ms...`);
    await delay(timeout);
  }

  const binding = {
    apiVersion: 'v1',
    kind: 'Binding',
    metadata: {
      name: pod.metadata.name,
    },
    target: {
      apiVersion: 'v1',
      kind: 'Node',
      name: node.metadata.name,
    },
  };

  await k8sApi.createNamespacedBinding({
    namespace: NAMESPACE_NAME,
    body: binding,
  });

  console.log(`Scheduled pod '${pod.metadata.name}' to node '${node.metadata.name}'`);
}

function getPriority(pod) {
  return parseInt(pod.metadata.annotations?.priority || '0');
}

module.exports = {
  k8sApi,
  watch,
  SCHEDULER_NAME,
  NAMESPACE_NAME,
  shouldSchedule,
  bindPodToNode,
  getPriority,
};
