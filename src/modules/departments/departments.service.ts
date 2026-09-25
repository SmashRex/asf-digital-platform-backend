import { AppError } from "../../errors/appError.js";
import * as repo from "./departments.repository.js";
import type { CreateDepartmentInput } from "./departments.validation.js";

export async function getDepartments() {
  return repo.listDepartments();
}

export async function createDepartment(input: CreateDepartmentInput) {
  const existing = await repo.findById(input.id);
  if (existing) {
    throw AppError.conflict("A department with this id already exists", "DEPARTMENT_ALREADY_EXISTS");
  }
  return repo.createDepartment(input);
}