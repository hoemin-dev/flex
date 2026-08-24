import type { Membership, Organization, Person } from "../types/chat";

export interface OrganizationProvider {
  listOrganizations(): Promise<Organization[]>;
  listPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | undefined>;
  getMemberships(personId?: string): Promise<Membership[]>;
}
