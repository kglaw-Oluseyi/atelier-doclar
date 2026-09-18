import {
  MEF_SLOTS,
  PERMISSION_KEYS,
  PERMISSION_REGISTRY,
  ROLE_KEYS,
  type RoleKey,
} from "./permissions";
import { getPool } from "./db";

export const IDS = {
  org: "11111111-1111-4111-8111-111111111111",
  orgOther: "22222222-2222-4222-8222-222222222222",
  ceo: "10000000-0000-4000-8000-000000000001",
  director: "10000000-0000-4000-8000-000000000002",
  planner: "10000000-0000-4000-8000-000000000003",
  clientLead: "10000000-0000-4000-8000-000000000004",
  departmentLead: "10000000-0000-4000-8000-000000000005",
  administrator: "10000000-0000-4000-8000-000000000006",
  auditor: "10000000-0000-4000-8000-000000000007",
  reviewer: "10000000-0000-4000-8000-000000000008",
  unassigned: "10000000-0000-4000-8000-000000000009",
  client: "30000000-0000-4000-8000-000000000001",
  otherClient: "30000000-0000-4000-8000-000000000002",
  programme: "31000000-0000-4000-8000-000000000001",
  eventA: "40000000-0000-4000-8000-000000000001",
  eventB: "40000000-0000-4000-8000-000000000002",
  otherEvent: "40000000-0000-4000-8000-000000000099",
  department: "50000000-0000-4000-8000-000000000001",
  workstream: "51000000-0000-4000-8000-000000000001",
} as const;

const PEOPLE: Array<{ id: string; name: string; email: string; role: RoleKey | "UNASSIGNED" }> = [
  {
    id: IDS.ceo,
    name: "Adaeze Okonkwo",
    email: "adaeze.okonkwo@synthetic.maisondoclar.test",
    role: "CEO",
  },
  {
    id: IDS.director,
    name: "Chinedu Adeyemi",
    email: "chinedu.adeyemi@synthetic.maisondoclar.test",
    role: "EVENT_DIRECTOR",
  },
  {
    id: IDS.planner,
    name: "Folake Bello",
    email: "folake.bello@synthetic.maisondoclar.test",
    role: "PLANNER",
  },
  {
    id: IDS.clientLead,
    name: "Ifeanyi Nwosu",
    email: "ifeanyi.nwosu@synthetic.maisondoclar.test",
    role: "CLIENT_LEAD",
  },
  {
    id: IDS.departmentLead,
    name: "Ngozi Eze",
    email: "ngozi.eze@synthetic.maisondoclar.test",
    role: "DEPARTMENT_LEAD",
  },
  {
    id: IDS.administrator,
    name: "Tunde Bakare",
    email: "tunde.bakare@synthetic.maisondoclar.test",
    role: "SYSTEM_ADMINISTRATOR",
  },
  {
    id: IDS.auditor,
    name: "Amaka Obi",
    email: "amaka.obi@synthetic.maisondoclar.test",
    role: "READ_ONLY_AUDITOR",
  },
  {
    id: IDS.reviewer,
    name: "Yewande Cole",
    email: "yewande.cole@synthetic.maisondoclar.test",
    role: "RISK_GOVERNANCE_REVIEWER",
  },
  {
    id: IDS.unassigned,
    name: "Kemi Diallo",
    email: "kemi.diallo@synthetic.maisondoclar.test",
    role: "UNASSIGNED",
  },
];

function roleId(org: string, role: RoleKey): string {
  const index = ROLE_KEYS.indexOf(role) + 1;
  const prefix = org === IDS.org ? "61" : "62";
  return `${prefix}000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

export async function seedFoundation(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO eos_s01");
    for (const org of [
      [IDS.org, "synthetic-maison-doclar", "Synthetic Maison Doclar Atelier"],
      [IDS.orgOther, "synthetic-isolated-house", "Synthetic Isolated House"],
    ] as const) {
      await client.query(
        `INSERT INTO organisations (id, slug, legal_name, display_name, status, default_timezone, synthetic)
         VALUES ($1,$2,$3,$3,'ACTIVE','Africa/Lagos',true) ON CONFLICT (id) DO NOTHING`,
        [org[0], org[1], org[2]],
      );
      for (const role of ROLE_KEYS) {
        await client.query(
          `INSERT INTO roles (id, organisation_id, key, name, description, system_role, status)
           VALUES ($1,$2,$3,$4,$5,true,'ACTIVE') ON CONFLICT (id) DO NOTHING`,
          [roleId(org[0], role), org[0], role, role.replaceAll("_", " "), `${role} system role`],
        );
      }
      await client.query(
        `INSERT INTO approval_policies (id, organisation_id, key, action, reserved_to_ceo, active)
         VALUES ($1,$2,'event-archive','event.archive',true,true) ON CONFLICT (id) DO NOTHING`,
        [
          org[0] === IDS.org
            ? "71000000-0000-4000-8000-000000000001"
            : "71000000-0000-4000-8000-000000000002",
          org[0],
        ],
      );
    }
    for (const key of PERMISSION_KEYS) {
      const entry = PERMISSION_REGISTRY[key];
      await client.query(
        `INSERT INTO permissions (key, description, effect, required_scope, mutates, external_effect, ceo_reserved, technical_only, maker_checker)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description, effect = EXCLUDED.effect, required_scope = EXCLUDED.required_scope,
           mutates = EXCLUDED.mutates, external_effect = EXCLUDED.external_effect, ceo_reserved = EXCLUDED.ceo_reserved,
           technical_only = EXCLUDED.technical_only, maker_checker = EXCLUDED.maker_checker`,
        [
          key,
          entry.description,
          entry.effect,
          entry.scope,
          entry.mutates,
          entry.externalEffect,
          entry.ceoReserved,
          entry.technicalOnly,
          entry.makerChecker,
        ],
      );
    }
    for (const org of [IDS.org, IDS.orgOther]) {
      for (const role of ROLE_KEYS) {
        const id = roleId(org, role);
        await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
        for (const key of PERMISSION_KEYS) {
          if ((PERMISSION_REGISTRY[key].permittedRoles as readonly string[]).includes(role)) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_key, effect) VALUES ($1,$2,'ALLOW')`,
              [id, key],
            );
          }
        }
      }
    }
    for (const person of PEOPLE) {
      await client.query(
        `INSERT INTO users (id, external_subject, email, display_name, status, synthetic)
         VALUES ($1,$2,$3,$4,'ACTIVE',true) ON CONFLICT (id) DO NOTHING`,
        [person.id, `fixture:${person.id}`, person.email, person.name],
      );
      await client.query(
        `INSERT INTO memberships (id, organisation_id, user_id, status)
         VALUES ($1,$2,$3,'ACTIVE') ON CONFLICT (organisation_id, user_id) DO NOTHING`,
        [`81000000-0000-4000-8000-${person.id.slice(-12)}`, IDS.org, person.id],
      );
    }
    await client.query(
      `INSERT INTO clients (id, organisation_id, code, display_name, legal_name, status, synthetic)
       VALUES ($1,$2,'SYN-ADEYEMI','Synthetic House of Adeyemi','Synthetic House of Adeyemi Ltd','ACTIVE',true)
       ON CONFLICT (id) DO NOTHING`,
      [IDS.client, IDS.org],
    );
    await client.query(
      `INSERT INTO clients (id, organisation_id, code, display_name, status, synthetic)
       VALUES ($1,$2,'SYN-OTHER','Synthetic Other Client','ACTIVE',true) ON CONFLICT (id) DO NOTHING`,
      [IDS.otherClient, IDS.orgOther],
    );
    await client.query(
      `INSERT INTO event_programmes (id, organisation_id, client_id, name, status) VALUES ($1,$2,$3,'Synthetic Season','ACTIVE') ON CONFLICT (id) DO NOTHING`,
      [IDS.programme, IDS.org, IDS.client],
    );
    await client.query(
      `INSERT INTO events (id, organisation_id, client_id, programme_id, code, name, starts_at, ends_at, timezone, venue_summary, phase, status, synthetic)
       VALUES ($1,$2,$3,$4,'SYN-COVENANT','Synthetic Covenant','2026-11-12T16:00:00Z','2026-11-12T22:00:00Z','Africa/Lagos','Synthetic waterfront pavilion','DISCOVER','ACTIVE',true)
       ON CONFLICT (id) DO NOTHING`,
      [IDS.eventA, IDS.org, IDS.client, IDS.programme],
    );
    await client.query(
      `INSERT INTO events (id, organisation_id, client_id, code, name, starts_at, ends_at, timezone, phase, status, synthetic)
       VALUES ($1,$2,$3,'SYN-HARVEST','Synthetic Harvest','2026-12-04T15:00:00Z','2026-12-04T21:00:00Z','Africa/Lagos','DESIGN','ACTIVE',true)
       ON CONFLICT (id) DO NOTHING`,
      [IDS.eventB, IDS.org, IDS.client],
    );
    await client.query(
      `INSERT INTO events (id, organisation_id, client_id, code, name, starts_at, ends_at, timezone, phase, status, synthetic)
       VALUES ($1,$2,$3,'SYN-HIDDEN','Synthetic Hidden Event','2026-10-01T10:00:00Z','2026-10-01T12:00:00Z','Africa/Lagos','DISCOVER','ACTIVE',true)
       ON CONFLICT (id) DO NOTHING`,
      [IDS.otherEvent, IDS.orgOther, IDS.otherClient],
    );
    await client.query(
      `INSERT INTO departments (id, organisation_id, code, name, status) VALUES ($1,$2,'SYN-PROTOCOL','Synthetic Protocol','ACTIVE') ON CONFLICT (id) DO NOTHING`,
      [IDS.department, IDS.org],
    );
    await client.query(
      `INSERT INTO workstreams (id, organisation_id, event_id, department_id, code, name, status, operational_note)
       VALUES ($1,$2,$3,$4,'SYN-CEREMONY','Synthetic Ceremony','ACTIVE','Synthetic briefing') ON CONFLICT (id) DO NOTHING`,
      [IDS.workstream, IDS.org, IDS.eventA, IDS.department],
    );
    for (const eventId of [IDS.eventA, IDS.eventB, IDS.otherEvent]) {
      const org = eventId === IDS.otherEvent ? IDS.orgOther : IDS.org;
      const clientId = eventId === IDS.otherEvent ? IDS.otherClient : IDS.client;
      const mefId = `72000000-0000-4000-8000-${eventId.slice(-12)}`;
      await client.query(
        `INSERT INTO master_event_files (id, organisation_id, client_id, event_id) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [mefId, org, clientId, eventId],
      );
      for (const [index, slot] of MEF_SLOTS.entries()) {
        await client.query(
          `INSERT INTO mef_slots (id, organisation_id, master_event_file_id, slot_key, status, verification_state)
           VALUES ($1,$2,$3,$4,'NOT_COMPOSED','UNVERIFIED') ON CONFLICT (id) DO NOTHING`,
          [
            `73000000-0000-4000-8${String(index).padStart(3, "0")}-${eventId.slice(-12)}`,
            org,
            mefId,
            slot,
          ],
        );
      }
    }
    const grants = [
      [
        "a1000000-0000-4000-8000-000000000001",
        IDS.ceo,
        "CEO",
        "ORGANISATION",
        null,
        null,
        null,
        null,
      ],
      [
        "a1000000-0000-4000-8000-000000000002",
        IDS.director,
        "EVENT_DIRECTOR",
        "EVENT",
        IDS.client,
        IDS.eventA,
        null,
        null,
      ],
      [
        "a1000000-0000-4000-8000-000000000003",
        IDS.director,
        "EVENT_DIRECTOR",
        "EVENT",
        IDS.client,
        IDS.eventB,
        null,
        null,
      ],
      [
        "a1000000-0000-4000-8000-000000000004",
        IDS.planner,
        "PLANNER",
        "EVENT",
        IDS.client,
        IDS.eventA,
        null,
        null,
      ],
      [
        "a1000000-0000-4000-8000-000000000005",
        IDS.clientLead,
        "CLIENT_LEAD",
        "CLIENT",
        IDS.client,
        null,
        null,
        null,
      ],
      [
        "a1000000-0000-4000-8000-000000000006",
        IDS.departmentLead,
        "DEPARTMENT_LEAD",
        "WORKSTREAM",
        IDS.client,
        IDS.eventA,
        IDS.department,
        IDS.workstream,
      ],
      [
        "a1000000-0000-4000-8000-000000000007",
        IDS.administrator,
        "SYSTEM_ADMINISTRATOR",
        "ORGANISATION",
        null,
        null,
        null,
        null,
      ],
      [
        "a1000000-0000-4000-8000-000000000008",
        IDS.auditor,
        "READ_ONLY_AUDITOR",
        "ORGANISATION",
        null,
        null,
        null,
        null,
      ],
      [
        "a1000000-0000-4000-8000-000000000009",
        IDS.reviewer,
        "RISK_GOVERNANCE_REVIEWER",
        "GOVERNANCE",
        IDS.client,
        IDS.eventA,
        null,
        null,
      ],
    ] as const;
    for (const grant of grants) {
      await client.query(
        `INSERT INTO assignments (id, organisation_id, user_id, role_id, scope_kind, governance_mandate, client_id, event_id, department_id, workstream_id, status, granted_by_user_id, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE',$11,'Synthetic rehearsal grant') ON CONFLICT (id) DO NOTHING`,
        [
          grant[0],
          IDS.org,
          grant[1],
          roleId(IDS.org, grant[2]),
          grant[3],
          grant[3] === "GOVERNANCE",
          grant[4],
          grant[5],
          grant[6],
          grant[7],
          IDS.ceo,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
