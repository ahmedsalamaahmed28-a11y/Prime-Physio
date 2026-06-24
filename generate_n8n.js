const fs = require('fs');

const workflows = [
  { id: 'wf01', name: 'Multi-Tenant Clinic Creation', agent: 'Supervisor Agent', action: 'create_clinic' },
  { id: 'wf02', name: 'Lead Capture', agent: 'Reception Agent', action: 'create_lead' },
  { id: 'wf03', name: 'Patient Registration', agent: 'Reception Agent', action: 'register_patient' },
  { id: 'wf04', name: 'Online Appointment Booking', agent: 'Reception Agent', action: 'book_appointment' },
  { id: 'wf05', name: 'Waiting List Engine', agent: 'Reception Agent', action: 'add_to_waitlist' },
  { id: 'wf06', name: 'Patient Check-in', agent: 'Reception Agent', action: 'check_in_patient' },
  { id: 'wf07', name: 'AI Assessment Assistant', agent: 'Clinical Agent', action: 'save_assessment' },
  { id: 'wf08', name: 'AI Treatment Planner', agent: 'Clinical Agent', action: 'save_treatment_plan' },
  { id: 'wf09', name: 'Session Documentation', agent: 'Documentation Agent', action: 'save_soap_note' },
  { id: 'wf10', name: 'Progress Tracking', agent: 'Clinical Agent', action: 'update_progress' },
  { id: 'wf11', name: 'Patient Risk Detection', agent: 'Clinical Agent', action: 'flag_patient_risk' },
  { id: 'wf12', name: 'Discharge Automation', agent: 'Documentation Agent', action: 'save_discharge' },
  { id: 'wf13', name: 'Payment Collection', agent: 'Billing Agent', action: 'generate_invoice' },
  { id: 'wf14', name: 'Outstanding Balance Recovery', agent: 'Billing Agent', action: 'log_outstanding_recovery' },
  { id: 'wf15', name: 'Insurance Processing', agent: 'Billing Agent', action: 'save_insurance_claim' },
  { id: 'wf16', name: 'Patient Retention Engine', agent: 'Marketing Agent', action: 'save_marketing_campaign' },
  { id: 'wf17', name: 'Marketing Campaign Generator', agent: 'Marketing Agent', action: 'save_marketing_campaign' },
  { id: 'wf18', name: 'Referral System', agent: 'Marketing Agent', action: 'track_referral' },
  { id: 'wf19', name: 'Therapist Performance Engine', agent: 'Analytics Agent', action: 'save_daily_report' },
  { id: 'wf20', name: 'Reception Performance Engine', agent: 'Analytics Agent', action: 'save_daily_report' },
  { id: 'wf21', name: 'HR Attendance System', agent: 'HR Agent', action: 'save_hr_attendance' },
  { id: 'wf22', name: 'Payroll Preparation', agent: 'HR Agent', action: 'save_payroll_draft' },
  { id: 'wf23', name: 'Daily Operations Report', agent: 'Analytics Agent', action: 'save_daily_report' },
  { id: 'wf24', name: 'Executive Intelligence Report', agent: 'Analytics Agent', action: 'save_executive_report' },
  { id: 'wf25', name: 'AI Business Consultant', agent: 'Analytics Agent', action: 'save_executive_report' },
  { id: 'wf26', name: 'Multi-Branch Analytics', agent: 'Analytics Agent', action: 'save_executive_report' },
  { id: 'wf27', name: 'Security Monitor', agent: 'Security Agent', action: 'log_audit_event' },
  { id: 'wf28', name: 'Audit Log Engine', agent: 'Security Agent', action: 'log_audit_event' },
  { id: 'wf29', name: 'Automated Backup', agent: 'Supervisor Agent', action: 'log_audit_event' },
  { id: 'wf30', name: 'Disaster Recovery', agent: 'Supervisor Agent', action: 'log_audit_event' }
];

const nodes = [];
const connections = {};

// Webhook Node
nodes.push({
  parameters: { httpMethod: "POST", path: "physio-os-webhook", responseMode: "lastNode", options: {} },
  id: "webhook-trigger",
  name: "Webhook Trigger",
  type: "n8n-nodes-base.webhook",
  typeVersion: 1,
  position: [0, 5000]
});

// Switch Node
const switchRules = workflows.map((wf, index) => ({
  value2: wf.action,
  outputKey: index.toString()
}));

nodes.push({
  parameters: {
    dataType: "string",
    value1: "={{$json.body.action}}",
    rules: { rules: switchRules }
  },
  id: "main-router",
  name: "Switch (Router)",
  type: "n8n-nodes-base.switch",
  typeVersion: 1,
  position: [300, 5000]
});

connections["Webhook Trigger"] = {
  main: [ [ { node: "Switch (Router)", type: "main", index: 0 } ] ]
};

connections["Switch (Router)"] = { main: [] };

workflows.forEach((wf, i) => {
  const yPos = i * 300;
  
  const agentNodeId = `agent-${wf.id}`;
  const apiNodeId = `api-${wf.id}`;

  // Agent Node
  nodes.push({
    parameters: {
      model: "gpt-4-turbo-preview",
      messages: {
        messages: [
          { role: "system", content: `You are the ${wf.agent} for Physio OS Enterprise. Execute workflow: ${wf.name}.` },
          { role: "user", content: "={{ JSON.stringify($json.body.data) }}" }
        ]
      }
    },
    id: agentNodeId,
    name: `${wf.name} (${wf.agent})`,
    type: "n8n-nodes-base.openAi",
    typeVersion: 1,
    position: [700, yPos]
  });

  // API Node
  nodes.push({
    parameters: {
      method: "POST",
      url: "https://your-domain.com/api/n8n",
      sendHeaders: true,
      headerParameters: {
        parameters: [ { name: "Authorization", value: "Bearer prime_physio_n8n_secret_123" } ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={\n  "action": "${wf.action}",\n  "clinicId": "{{$('Webhook Trigger').item.json.body.clinicId}}",\n  "data": { "ai_response": "{{$json.message.content}}" }\n}`,
      options: {}
    },
    id: apiNodeId,
    name: `Save ${wf.name} Data`,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    position: [1100, yPos]
  });

  // Connect Router -> Agent
  connections["Switch (Router)"].main.push([{ node: agentNodeId, type: "main", index: 0 }]);
  
  // Connect Agent -> API
  connections[agentNodeId] = { main: [ [ { node: apiNodeId, type: "main", index: 0 } ] ] };
});

const workflowJson = {
  name: "Physio OS Enterprise - ALL 30 WORKFLOWS",
  nodes,
  connections,
  settings: { executionOrder: "v1" }
};

fs.writeFileSync('n8n-master-workflow.json', JSON.stringify(workflowJson, null, 2));
console.log('n8n-master-workflow.json generated with ' + workflows.length + ' workflows.');
