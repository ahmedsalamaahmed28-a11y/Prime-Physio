const fs = require('fs');

const nodes = [
  {
    parameters: { httpMethod: "POST", path: "physio-patient-journey", responseMode: "lastNode", options: {} },
    id: "webhook",
    name: "Patient Session Ended (Webhook)",
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: [100, 300]
  },
  {
    parameters: {
      model: "gpt-4-turbo-preview",
      messages: {
        messages: [
          { role: "system", content: "You are the Clinical Agent. Analyze raw session transcripts. Output an Assessment (symptoms, ROM) and a Treatment Plan (goals, exercises)." },
          { role: "user", content: "={{ JSON.stringify($json.body.raw_notes) }}" }
        ]
      }
    },
    id: "clinical-agent",
    name: "1. Clinical Agent (Analysis)",
    type: "n8n-nodes-base.openAi",
    typeVersion: 1,
    position: [400, 300]
  },
  {
    parameters: {
      model: "gpt-4-turbo-preview",
      messages: {
        messages: [
          { role: "system", content: "You are the Documentation Agent. Take the Clinical Agent's output and format it into a formal SOAP Note (Subjective, Objective, Assessment, Plan)." },
          { role: "user", content: "={{ $json.message.content }}" }
        ]
      }
    },
    id: "documentation-agent",
    name: "2. Documentation Agent (SOAP)",
    type: "n8n-nodes-base.openAi",
    typeVersion: 1,
    position: [700, 300]
  },
  {
    parameters: {
      model: "gpt-4-turbo-preview",
      messages: {
        messages: [
          { role: "system", content: "You are the Billing Agent. Read the SOAP note and Treatment Plan. Determine the appropriate billing codes and generate an invoice amount and description." },
          { role: "user", content: "={{ $json.message.content }}" }
        ]
      }
    },
    id: "billing-agent",
    name: "3. Billing Agent (Invoice)",
    type: "n8n-nodes-base.openAi",
    typeVersion: 1,
    position: [1000, 300]
  },
  {
    parameters: {
      model: "gpt-4-turbo-preview",
      messages: {
        messages: [
          { role: "system", content: "You are the Marketing & Retention Agent. Read the patient's SOAP note and Invoice details. Write a friendly, personalized WhatsApp follow-up message wishing them recovery and confirming their next session." },
          { role: "user", content: "SOAP NOTE:\n{{ $('2. Documentation Agent (SOAP)').item.json.message.content }}\n\nINVOICE:\n{{ $json.message.content }}" }
        ]
      }
    },
    id: "marketing-agent",
    name: "4. Marketing Agent (Follow-up)",
    type: "n8n-nodes-base.openAi",
    typeVersion: 1,
    position: [1300, 300]
  },
  {
    parameters: {
      method: "POST",
      url: "https://your-domain.com/api/n8n",
      sendHeaders: true,
      headerParameters: {
        parameters: [ { name: "Authorization", value: "Bearer prime_physio_n8n_secret_123" } ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={\n  "action": "save_sequential_journey",\n  "clinicId": "{{$('Patient Session Ended (Webhook)').item.json.body.clinicId}}",\n  "data": {\n    "clinical_plan": "{{$('1. Clinical Agent (Analysis)').item.json.message.content}}",\n    "soap_note": "{{$('2. Documentation Agent (SOAP)').item.json.message.content}}",\n    "invoice_details": "{{$('3. Billing Agent (Invoice)').item.json.message.content}}",\n    "whatsapp_message": "{{$json.message.content}}"\n  }\n}`,
      options: {}
    },
    id: "api-save",
    name: "5. Save All to Database",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    position: [1600, 300]
  }
];

const connections = {
  "Patient Session Ended (Webhook)": { main: [ [ { node: "clinical-agent", type: "main", index: 0 } ] ] },
  "clinical-agent": { main: [ [ { node: "documentation-agent", type: "main", index: 0 } ] ] },
  "documentation-agent": { main: [ [ { node: "billing-agent", type: "main", index: 0 } ] ] },
  "billing-agent": { main: [ [ { node: "marketing-agent", type: "main", index: 0 } ] ] },
  "marketing-agent": { main: [ [ { node: "api-save", type: "main", index: 0 } ] ] }
};

const workflowJson = {
  name: "Physio OS - Sequential AI Pipeline (Patient Journey)",
  nodes,
  connections,
  settings: { executionOrder: "v1" }
};

fs.writeFileSync('n8n-sequential-pipeline.json', JSON.stringify(workflowJson, null, 2));
console.log('Sequential pipeline generated.');
