/**
 * n8n Code node — Data Tables API Handler
 * CONFIG is injected at build time from n8n/gmb-config.json
 */

const CONFIG = __GMB_CONFIG__;

const TABLES = {
  businesses: CONFIG.tables.businesses,
  services: CONFIG.tables.services,
  leads: CONFIG.tables.leads,
  reviews: CONFIG.tables.reviews,
  logs: CONFIG.tables.logs,
};

const API_KEY = CONFIG.n8nApiKey || '';
const BASE = (CONFIG.n8nBaseUrl || 'http://localhost:5678').replace(/\/$/, '');
const APP_URL = (CONFIG.appUrl || 'http://localhost:3000').replace(/\/$/, '');

async function httpRequest(options) {
  if (typeof $helpers !== 'undefined' && $helpers.httpRequest) {
    return $helpers.httpRequest(options);
  }
  if (typeof this !== 'undefined' && this.helpers && this.helpers.httpRequest) {
    return this.helpers.httpRequest(options);
  }

  const method = options.method || 'GET';
  const headers = { ...(options.headers || {}) };
  let body;
  if (options.body !== undefined) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(options.url, { method, headers, body });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}${text ? `: ${text}` : ''}`);
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeRow(r) {
  if (!r) return r;
  const n8nId = r.id;
  const recordId = r.record_id || '';
  const { createdAt, updatedAt, ...rest } = r;
  return {
    ...rest,
    _rowId: n8nId,
    id: recordId || String(n8nId),
  };
}

function toTableRow(row) {
  const { _rowId, id, record_id, ...rest } = row;
  return { ...rest, record_id: record_id || id };
}

async function tableGetAll(tableId) {
  if (!tableId) throw new Error('Data table ID not configured');
  const all = [];
  let cursor = null;

  do {
    const url = cursor
      ? `${BASE}/api/v1/data-tables/${tableId}/rows?limit=250&cursor=${encodeURIComponent(cursor)}`
      : `${BASE}/api/v1/data-tables/${tableId}/rows?limit=250`;
    const res = await httpRequest({
      method: 'GET',
      url,
      headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
      json: true,
    });
    const rows = res.data || [];
    all.push(...rows.map(normalizeRow));
    cursor = res.nextCursor || null;
  } while (cursor);

  return all;
}

async function tableInsert(tableId, row) {
  const tableRow = toTableRow(row);
  const res = await httpRequest({
    method: 'POST',
    url: `${BASE}/api/v1/data-tables/${tableId}/rows`,
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: { data: [tableRow], returnType: 'all' },
    json: true,
  });
  const rows = Array.isArray(res) ? res : (res.data || []);
  const created = rows[0];
  const normalized = normalizeRow(created);
  if (normalized) return { data: normalized };
  return {
    data: normalizeRow({
      ...tableRow,
      record_id: tableRow.record_id || row.id,
    }),
  };
}

async function tableUpdate(tableId, recordId, row) {
  const payload = toTableRow(row);
  delete payload.record_id;
  await httpRequest({
    method: 'PATCH',
    url: `${BASE}/api/v1/data-tables/${tableId}/rows/update`,
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: {
      filter: {
        type: 'and',
        filters: [{ columnName: 'record_id', condition: 'eq', value: recordId }],
      },
      data: payload,
    },
    json: true,
  });
}

async function tableBulkUpdateByFilter(tableId, filter, data) {
  const res = await httpRequest({
    method: 'PATCH',
    url: `${BASE}/api/v1/data-tables/${tableId}/rows/update`,
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: { filter, data, returnData: true },
    json: true,
  });
  const rows = Array.isArray(res) ? res : (res.data || []);
  return rows.length;
}

async function tableDelete(tableId, recordId) {
  const filter = encodeURIComponent(
    JSON.stringify({
      type: 'and',
      filters: [{ columnName: 'record_id', condition: 'eq', value: recordId }],
    })
  );
  await httpRequest({
    method: 'DELETE',
    url: `${BASE}/api/v1/data-tables/${tableId}/rows/delete?filter=${filter}`,
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
    json: true,
  });
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}

function replaceTemplate(text, vars) {
  return String(text)
    .replace(/\{\{name\}\}/g, vars.name || '')
    .replace(/\{\{service\}\}/g, vars.service || '')
    .replace(/\{\{review_link\}\}/g, vars.review_link || '');
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function paginateList(items, page, limit) {
  const total = items.length;
  const lim = Math.min(100, Math.max(1, Number(limit) || 25));
  const pg = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(total / lim) || 1);
  const safePage = Math.min(pg, totalPages);
  const start = (safePage - 1) * lim;
  return {
    items: items.slice(start, start + lim),
    pagination: {
      page: safePage,
      limit: lim,
      total,
      total_pages: totalPages,
    },
  };
}

function buildGmbReviewUrl(placeId) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

function markdownToHtml(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return '';
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  let html = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function emptyToNull(value) {
  return value === '' || value === undefined ? null : value;
}

const defaultServices = [
  { name: 'Digital Marketing', subject: 'How was your marketing experience with us?', body: 'Hi {{name}},\n\nThank you for working with us on {{service}}. We would love your feedback:\n\n{{review_link}}\n\nThank you!' },
  { name: 'Dev', subject: 'Share your experience with our development team', body: 'Hi {{name}},\n\nWe hope you enjoyed our {{service}} work. Please leave a quick review:\n\n{{review_link}}\n\nBest regards' },
  { name: 'Design', subject: 'We value your feedback on our design work', body: 'Hi {{name}},\n\nYour opinion on our {{service}} matters. Leave a review here:\n\n{{review_link}}\n\nThanks!' },
];

const input = $input.first().json;
const body = input.body ?? input;
const headers = input.headers ?? {};

if ((CONFIG.gmbApiKey || '') && headers['x-api-key'] !== CONFIG.gmbApiKey && headers['X-API-Key'] !== CONFIG.gmbApiKey) {
  return [{ json: { error: 'Unauthorized' } }];
}

const { action, ...params } = body;
const now = new Date().toISOString();

let result = {};
const emailJobs = [];

async function migrateFromStaticIfNeeded(businesses, services, leads, reviews, logs) {
  const staticData = $getWorkflowStaticData('global');
  const store = staticData.store;
  if (!store || staticData.migratedToTables) return;
  if (businesses.length > 0) {
    staticData.migratedToTables = true;
    return;
  }
  if (!store.businesses?.length) return;

  for (const b of store.businesses) {
    const row = {
      id: b.id,
      slug: b.slug,
      name: b.name,
      place_id: b.place_id || '',
      logo_url: b.logo_url || '',
      owner_email: b.owner_email || '',
      created_at: b.created_at || now,
    };
    const inserted = await tableInsert(TABLES.businesses, row);
    businesses.push(inserted.data);
  }
  for (const s of store.services || []) {
    const row = {
      id: s.id,
      business_id: s.business_id,
      name: s.name,
      slug: s.slug,
      email_subject: s.email_subject,
      email_body: s.email_body,
      created_at: s.created_at || now,
    };
    const inserted = await tableInsert(TABLES.services, row);
    services.push(inserted.data);
  }
  for (const l of store.leads || []) {
    const row = {
      id: l.id,
      business_id: l.business_id,
      name: l.name,
      email: l.email,
      service_id: l.service_id || '',
      status: l.status,
      review_token: l.review_token,
      notes: l.notes || '',
      queued_at: l.queued_at || '',
      sent_at: l.sent_at || '',
      opened_at: l.opened_at || '',
      reviewed_at: l.reviewed_at || '',
      created_at: l.created_at || now,
    };
    const inserted = await tableInsert(TABLES.leads, row);
    leads.push(inserted.data);
  }
  for (const r of store.reviews || []) {
    const row = {
      id: r.id,
      lead_id: r.lead_id,
      business_id: r.business_id,
      rating: r.rating,
      comment: r.comment || '',
      redirected_to_gmb: !!r.redirected_to_gmb,
      created_at: r.created_at || now,
    };
    const inserted = await tableInsert(TABLES.reviews, row);
    reviews.push(inserted.data);
  }
  for (const log of store.logs || []) {
    const row = {
      id: log.id,
      business_id: log.business_id,
      lead_id: log.lead_id || '',
      event: log.event,
      detail: log.detail,
      metadata: log.metadata ? JSON.stringify(log.metadata) : '',
      created_at: log.created_at || now,
    };
    const inserted = await tableInsert(TABLES.logs, row);
    logs.push(inserted.data);
  }
  staticData.migratedToTables = true;
}

try {
  const [businesses, services, leads, reviews, logs] = await Promise.all([
    tableGetAll(TABLES.businesses),
    tableGetAll(TABLES.services),
    tableGetAll(TABLES.leads),
    tableGetAll(TABLES.reviews),
    tableGetAll(TABLES.logs),
  ]);

  await migrateFromStaticIfNeeded(businesses, services, leads, reviews, logs);

  async function writeLog(businessId, event, detail, leadId = null, metadata = null) {
    const entry = {
      id: uuid(),
      business_id: businessId,
      lead_id: leadId || '',
      event,
      detail,
      metadata: metadata ? JSON.stringify(metadata) : '',
      created_at: now,
    };
    const inserted = await tableInsert(TABLES.logs, entry);
    logs.unshift(inserted.data);
  }

  function findBusiness(slug) {
    return businesses.find((b) => b.slug === slug);
  }

  function findLeadByEmail(businessId, email) {
    const norm = normalizeEmail(email);
    return leads.find(
      (l) => l.business_id === businessId && normalizeEmail(l.email) === norm
    );
  }

  function serializeLead(lead) {
    if (!lead) return lead;
    return {
      ...lead,
      service_id: emptyToNull(lead.service_id),
      notes: emptyToNull(lead.notes),
      queued_at: emptyToNull(lead.queued_at),
      sent_at: emptyToNull(lead.sent_at),
      opened_at: emptyToNull(lead.opened_at),
      reviewed_at: emptyToNull(lead.reviewed_at),
      service_name: services.find((s) => s.id === lead.service_id)?.name,
    };
  }

  function serializeBusiness(business) {
    return {
      ...business,
      logo_url: emptyToNull(business.logo_url),
      owner_email: emptyToNull(business.owner_email),
    };
  }

  switch (action) {
    case 'health':
      result = { ok: true, storage: 'data-tables' };
      break;

    case 'business.create': {
      if (businesses.some((b) => b.slug === params.slug)) throw new Error('Business slug already exists');
      const business = {
        id: uuid(),
        slug: params.slug,
        name: params.name,
        place_id: params.place_id,
        logo_url: '',
        owner_email: params.owner_email || '',
        created_at: now,
      };
      const inserted = await tableInsert(TABLES.businesses, business);
      businesses.push(inserted.data);
      for (const tmpl of defaultServices) {
        const svc = {
          id: uuid(),
          business_id: business.id,
          name: tmpl.name,
          slug: slugify(tmpl.name),
          email_subject: tmpl.subject,
          email_body: tmpl.body,
          created_at: now,
        };
        const svcInserted = await tableInsert(TABLES.services, svc);
        services.push(svcInserted.data);
      }
      await writeLog(business.id, 'business.created', `Business "${business.name}" created`);
      result = { business: serializeBusiness(inserted.data) };
      break;
    }

    case 'business.get': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      result = { business: serializeBusiness(business) };
      break;
    }

    case 'business.list': {
      const list = businesses
        .map(serializeBusiness)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      result = { businesses: list };
      break;
    }

    case 'business.update': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const updated = { ...business };
      if (params.name) updated.name = params.name;
      if (params.place_id) updated.place_id = params.place_id;
      await tableUpdate(TABLES.businesses, business.id, updated);
      Object.assign(business, updated);
      await writeLog(business.id, 'business.updated', `Business "${business.name}" updated`);
      result = { business: serializeBusiness(updated) };
      break;
    }

    case 'service.list': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      let list = services.filter((s) => s.business_id === business.id);
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const paginated = paginateList(list, params.page, params.limit);
      result = { services: paginated.items, pagination: paginated.pagination };
      break;
    }

    case 'service.create': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const service = {
        id: uuid(),
        business_id: business.id,
        name: params.name,
        slug: slugify(params.name),
        email_subject: params.email_subject,
        email_body: params.email_body,
        created_at: now,
      };
      const inserted = await tableInsert(TABLES.services, service);
      services.push(inserted.data);
      await writeLog(business.id, 'service.created', `Service "${service.name}" created`);
      result = { service: inserted.data };
      break;
    }

    case 'service.update': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const service = services.find((s) => s.id === params.service_id && s.business_id === business.id);
      if (!service) throw new Error('Service not found');
      if (params.name) { service.name = params.name; service.slug = slugify(params.name); }
      if (params.email_subject) service.email_subject = params.email_subject;
      if (params.email_body) service.email_body = params.email_body;
      await tableUpdate(TABLES.services, service.id, service);
      await writeLog(business.id, 'service.updated', `Service "${service.name}" updated`);
      result = { service };
      break;
    }

    case 'lead.list': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const allBizLeads = leads.filter((l) => l.business_id === business.id);
      let list = allBizLeads;
      if (params.status) list = list.filter((l) => l.status === params.status);
      list = list.map(serializeLead);
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const unassigned_total = allBizLeads.filter((l) => !l.service_id).length;
      const paginated = paginateList(list, params.page, params.limit);
      result = {
        leads: paginated.items,
        pagination: paginated.pagination,
        unassigned_total,
      };
      break;
    }

    case 'lead.create': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      if (findLeadByEmail(business.id, params.email)) throw new Error('A lead with this email already exists');
      const service = services.find((s) => s.id === params.service_id && s.business_id === business.id);
      if (!service) throw new Error('Service not found');
      const lead = {
        id: uuid(),
        business_id: business.id,
        name: params.name,
        email: params.email,
        service_id: service.id,
        status: 'pending',
        review_token: uuid().replace(/-/g, '') + uuid().replace(/-/g, ''),
        notes: params.notes || '',
        queued_at: '',
        sent_at: '',
        opened_at: '',
        reviewed_at: '',
        created_at: now,
      };
      const inserted = await tableInsert(TABLES.leads, lead);
      const saved = inserted.data || { ...lead, id: lead.id };
      leads.push(saved);
      await writeLog(business.id, 'lead.created', `Lead "${lead.name}" (${lead.email}) added`, lead.id);
      result = { lead: serializeLead(saved) };
      break;
    }

    case 'lead.import': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const imported = [];
      let skipped_duplicates = 0;
      for (const row of params.leads || []) {
        if (!row.name || !row.email) continue;
        if (findLeadByEmail(business.id, row.email)) {
          skipped_duplicates++;
          continue;
        }
        let service = null;
        if (row.service && String(row.service).trim()) {
          service = services.find(
            (s) =>
              s.business_id === business.id &&
              s.name.toLowerCase() === String(row.service).trim().toLowerCase()
          );
          if (!service) continue;
        } else if (params.default_service_id) {
          service = services.find(
            (s) => s.id === params.default_service_id && s.business_id === business.id
          );
        }
        const lead = {
          id: uuid(),
          business_id: business.id,
          name: row.name,
          email: row.email,
          service_id: service ? service.id : '',
          status: 'pending',
          review_token: uuid().replace(/-/g, '') + uuid().replace(/-/g, ''),
          notes: row.notes || '',
          queued_at: '',
          sent_at: '',
          opened_at: '',
          reviewed_at: '',
          created_at: now,
        };
        const inserted = await tableInsert(TABLES.leads, lead);
        const saved = inserted.data || { ...lead, id: lead.id };
        leads.push(saved);
        imported.push(serializeLead(saved));
      }
      await writeLog(business.id, 'lead.imported', `Imported ${imported.length} leads`, null, { skipped_duplicates });
      result = { imported: imported.length, skipped_duplicates, leads: imported };
      break;
    }

    case 'lead.delete': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const deleted = [];
      for (const leadId of params.lead_ids || []) {
        const lead = leads.find((l) => l.id === leadId && l.business_id === business.id);
        if (!lead) continue;
        await tableDelete(TABLES.leads, lead.id);
        const idx = leads.findIndex((l) => l.id === lead.id);
        if (idx >= 0) leads.splice(idx, 1);
        deleted.push(lead.id);
        await writeLog(business.id, 'lead.deleted', `Deleted lead "${lead.name}" (${lead.email})`, lead.id);
      }
      result = { deleted: deleted.length, lead_ids: deleted };
      break;
    }

    case 'lead.update': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const lead = leads.find((l) => l.id === params.lead_id && l.business_id === business.id);
      if (!lead) throw new Error('Lead not found');

      const changes = [];
      if (params.name != null && String(params.name).trim()) {
        lead.name = String(params.name).trim();
        changes.push('name');
      }
      if (params.email != null && String(params.email).trim()) {
        const newEmail = String(params.email).trim();
        const duplicate = findLeadByEmail(business.id, newEmail);
        if (duplicate && duplicate.id !== lead.id) {
          throw new Error('A lead with this email already exists');
        }
        lead.email = newEmail;
        changes.push('email');
      }
      if (changes.length === 0) throw new Error('Nothing to update');

      await tableUpdate(TABLES.leads, lead.id, lead);
      await writeLog(
        business.id,
        'lead.updated',
        `Updated ${changes.join(' and ')} for "${lead.name}" (${lead.email})`,
        lead.id
      );
      result = { lead: serializeLead(lead) };
      break;
    }

    case 'lead.update_service': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const lead = leads.find((l) => l.id === params.lead_id && l.business_id === business.id);
      if (!lead) throw new Error('Lead not found');
      const service = services.find((s) => s.id === params.service_id && s.business_id === business.id);
      if (!service) throw new Error('Service not found');
      lead.service_id = service.id;
      await tableUpdate(TABLES.leads, lead.id, lead);
      await writeLog(business.id, 'lead.updated', `Assigned service "${service.name}" to ${lead.name}`, lead.id);
      result = { lead: serializeLead(lead) };
      break;
    }

    case 'lead.bulk_assign_service': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const service = services.find(
        (s) => s.id === params.service_id && s.business_id === business.id
      );
      if (!service) throw new Error('Service not found');

      let updated = 0;

      if (params.all_unassigned) {
        updated = await tableBulkUpdateByFilter(
          TABLES.leads,
          {
            type: 'and',
            filters: [
              { columnName: 'business_id', condition: 'eq', value: business.id },
              { columnName: 'service_id', condition: 'eq', value: '' },
            ],
          },
          { service_id: service.id }
        );
        for (const lead of leads) {
          if (lead.business_id === business.id && !lead.service_id) {
            lead.service_id = service.id;
          }
        }
      } else {
        const idSet = new Set(params.lead_ids || []);
        const targets = leads.filter(
          (l) => l.business_id === business.id && idSet.has(l.id)
        );
        for (const lead of targets) {
          if (lead.service_id === service.id) continue;
          lead.service_id = service.id;
          await tableUpdate(TABLES.leads, lead.id, lead);
          updated++;
        }
      }

      if (updated > 0) {
        await writeLog(
          business.id,
          'lead.updated',
          `Bulk assigned "${service.name}" to ${updated} lead(s)`
        );
      }
      result = { updated, service_name: service.name };
      break;
    }

    case 'lead.update_status': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const updated = [];
      const skipped = [];
      const noResend = ['sent', 'opened', 'reviewed'];

      for (const leadId of params.lead_ids || []) {
        const lead = leads.find((l) => l.id === leadId && l.business_id === business.id);
        if (!lead) continue;

        if (params.status === 'queued' && noResend.includes(lead.status)) {
          skipped.push(leadId);
          await writeLog(business.id, 'email.skipped', `Skipped ${lead.email} — already ${lead.status}`, lead.id);
          continue;
        }

        const service = services.find((s) => s.id === lead.service_id);
        if (params.status === 'queued' && !service) {
          skipped.push(leadId);
          await writeLog(business.id, 'email.skipped', `Skipped ${lead.email} — assign a service first`, lead.id);
          continue;
        }

        const oldStatus = lead.status;
        lead.status = params.status;
        if (params.status === 'queued') {
          lead.queued_at = now;
          const reviewLink = `${APP_URL}/review/${lead.review_token}`;
          const renderedBody = replaceTemplate(service.email_body, {
            name: lead.name,
            service: service.name,
            review_link: reviewLink,
          });
          emailJobs.push({
            lead_id: lead.id,
            business_id: business.id,
            to: lead.email,
            subject: replaceTemplate(service.email_subject, { name: lead.name, service: service.name, review_link: reviewLink }),
            body: markdownToHtml(renderedBody),
            body_text: renderedBody,
            is_html: true,
            lead_name: lead.name,
            service_name: service.name,
          });
        }
        await tableUpdate(TABLES.leads, lead.id, lead);
        await writeLog(business.id, 'status.changed', `${lead.name}: ${oldStatus} → ${params.status}`, lead.id, { old_status: oldStatus, new_status: params.status });
        updated.push(serializeLead(lead));
      }
      result = { updated, skipped };
      break;
    }

    case 'lead.email_result': {
      const lead = leads.find((l) => l.id === params.lead_id);
      if (!lead) throw new Error('Lead not found');
      const business = businesses.find((b) => b.id === lead.business_id);
      if (!business) throw new Error('Business not found');
      if (params.success) {
        lead.status = 'sent';
        lead.sent_at = now;
      } else {
        lead.status = 'failed';
        lead.queued_at = '';
      }
      await tableUpdate(TABLES.leads, lead.id, lead);
      await writeLog(
        business.id,
        params.success ? 'email.sent' : 'email.failed',
        params.success ? `Email sent to ${lead.email}` : `Email failed for ${lead.email}`,
        lead.id,
        params.success ? null : { error: params.error || null }
      );
      result = { ok: true, lead: serializeLead(lead) };
      break;
    }

    case 'review.get_lead': {
      const lead = leads.find((l) => l.review_token === params.token);
      if (!lead) throw new Error('Invalid review link');
      const business = businesses.find((b) => b.id === lead.business_id);
      const service = services.find((s) => s.id === lead.service_id);
      if (!service) throw new Error('Service not found for this lead');
      const already_reviewed = lead.status === 'reviewed';
      if (lead.status === 'sent') {
        lead.status = 'opened';
        lead.opened_at = now;
        await tableUpdate(TABLES.leads, lead.id, lead);
        await writeLog(business.id, 'review.opened', `${lead.name} opened review link`, lead.id);
      }
      const review = reviews.find((r) => r.lead_id === lead.id) || null;
      const eligible = review && Number(review.rating) >= 4 && !review.redirected_to_gmb;
      result = {
        lead: serializeLead(lead),
        business: serializeBusiness(business),
        service,
        already_reviewed,
        review,
        eligible_for_gmb: !!eligible,
        gmb_url: eligible ? buildGmbReviewUrl(business.place_id) : undefined,
      };
      break;
    }

    case 'review.submit': {
      const lead = leads.find((l) => l.review_token === params.token);
      if (!lead) throw new Error('Invalid review link');
      if (lead.status === 'reviewed') throw new Error('Review already submitted');
      const business = businesses.find((b) => b.id === lead.business_id);
      const rating = Number(params.rating);
      if (!rating || rating < 1 || rating > 5) throw new Error('Invalid rating');

      const eligible = rating >= 4;
      const review = {
        id: uuid(),
        lead_id: lead.id,
        business_id: business.id,
        rating,
        comment: params.comment || '',
        redirected_to_gmb: false,
        created_at: now,
      };
      await tableInsert(TABLES.reviews, review);
      lead.status = 'reviewed';
      lead.reviewed_at = now;
      await tableUpdate(TABLES.leads, lead.id, lead);
      await writeLog(business.id, 'review.submitted', `${lead.name} gave ${rating} stars`, lead.id, { rating, eligible_for_gmb: eligible });

      result = {
        success: true,
        eligible_for_gmb: eligible,
        gmb_url: eligible ? buildGmbReviewUrl(business.place_id) : undefined,
      };
      break;
    }

    case 'review.mark_gmb_redirect': {
      const lead = leads.find((l) => l.review_token === params.token);
      if (!lead) throw new Error('Invalid review link');
      const business = businesses.find((b) => b.id === lead.business_id);
      const review = reviews.find((r) => r.lead_id === lead.id);
      if (!review) throw new Error('Review not found');
      if (Number(review.rating) < 4) throw new Error('Review not eligible for Google redirect');

      const gmbUrl = buildGmbReviewUrl(business.place_id);
      if (!review.redirected_to_gmb) {
        review.redirected_to_gmb = true;
        await tableUpdate(TABLES.reviews, review.id, review);
        await writeLog(business.id, 'review.gmb_redirect', `${lead.name} opened Google review link`, lead.id);
      }

      result = { ok: true, redirected_to_gmb: true, gmb_url: gmbUrl };
      break;
    }

    case 'log.list': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      let list = logs.filter((l) => l.business_id === business.id);
      if (params.event) list = list.filter((l) => l.event === params.event);
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const paginated = paginateList(list, params.page, params.limit);
      result = { logs: paginated.items, pagination: paginated.pagination };
      break;
    }

    case 'stats.get': {
      const business = findBusiness(params.slug);
      if (!business) throw new Error('Business not found');
      const bizLeads = leads.filter((l) => l.business_id === business.id);
      const bizReviews = reviews.filter((r) => r.business_id === business.id);
      const avg = bizReviews.length
        ? bizReviews.reduce((s, r) => s + Number(r.rating), 0) / bizReviews.length
        : null;
      result = {
        stats: {
          total_leads: bizLeads.length,
          pending: bizLeads.filter((l) => l.status === 'pending').length,
          queued: bizLeads.filter((l) => l.status === 'queued').length,
          sent: bizLeads.filter((l) => l.status === 'sent').length,
          opened: bizLeads.filter((l) => l.status === 'opened').length,
          reviewed: bizLeads.filter((l) => l.status === 'reviewed').length,
          failed: bizLeads.filter((l) => l.status === 'failed').length,
          avg_rating: avg,
        },
      };
      break;
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
} catch (err) {
  return [{ json: { error: err.message } }];
}

const output = { ...result };
if (emailJobs.length > 0) output._emailJobs = emailJobs;

return [{ json: output }];
