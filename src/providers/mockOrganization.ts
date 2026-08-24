import type { Membership, Organization, Person } from "../types/chat";
import type { OrganizationProvider } from "./organization";

const organizations: Organization[] = [{ id: "monas", name: "MONAS" }];

const people: Person[] = [
  { id: "me", name: "박서윤", title: "매니저", departmentId: "rnd", presence: "online", avatarColor: "#7d8f69" },
  { id: "kim", name: "김도현", title: "대리", departmentId: "sales", presence: "online", avatarColor: "#806e94" },
  { id: "lee", name: "이정민", title: "과장", departmentId: "rnd", presence: "away", avatarColor: "#8a7562" },
  { id: "choi", name: "최유진", title: "책임", departmentId: "support", presence: "online", avatarColor: "#5f7d84" },
  { id: "jang", name: "장민석", title: "반장", departmentId: "factory", presence: "offline", avatarColor: "#777260" },
  { id: "han", name: "한지우", title: "사원", departmentId: "sales", presence: "online", avatarColor: "#806b6d" }
];

const departments = ["sales", "rnd", "support", "factory"];
const memberships: Membership[] = people.map((person) => ({ personId: person.id, organizationId: "monas", departmentId: person.departmentId }));

export const departmentNames: Record<string, string> = { sales: "영업부", rnd: "연구개발부", support: "지원", factory: "제조현장" };
export const mockDepartmentIds = departments;

export class MockOrganizationProvider implements OrganizationProvider {
  async listOrganizations() { return organizations; }
  async listPeople() { return people; }
  async getPerson(id: string) { return people.find((person) => person.id === id); }
  async getMemberships(personId?: string) { return personId ? memberships.filter((item) => item.personId === personId) : memberships; }
}
