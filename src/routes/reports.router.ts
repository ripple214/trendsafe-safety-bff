import express from 'express';

import { assessmentsComplianceByElement } from './reports/assessments/compliance-by-element';
import { assessmentsComplianceByCategory } from './reports/assessments/compliance-by-category';
import { assessmentsElementMonthlyTrend } from './reports/assessments/element-monthly-trend';
import { assessmentsRiskRating } from './reports/assessments/risk-rating';
import { assessmentsRiskCompliance } from './reports/assessments/risk-compliance';
import { assessmentsRuleCompliance } from './reports/assessments/rule-compliance';
import { assessmentsByDepartment } from './reports/assessments/assessments-by-department';
import { assessmentsByAssessor } from './reports/assessments/assessments-by-assessor';
import { assessmentsDetailedReport } from './reports/assessments/detailed-report';

import { inspectionsComplianceByElement } from './reports/inspections/compliance-by-element';
import { inspectionsComplianceByCategory } from './reports/inspections/compliance-by-category';
import { inspectionsElementMonthlyTrend } from './reports/inspections/element-monthly-trend';
import { inspectionsRiskRating } from './reports/inspections/risk-rating';
import { inspectionsRiskCompliance } from './reports/inspections/risk-compliance';
import { inspectionsRuleCompliance } from './reports/inspections/rule-compliance';
import { inspectionsByDepartment } from './reports/inspections/inspections-by-department';
import { inspectionsByAssessor } from './reports/inspections/inspections-by-assessor';
import { inspectionsDetailedReport } from './reports/inspections/detailed-report';

import { hazardsComplianceByElement } from './reports/hazards/compliance-by-element';
import { hazardsComplianceByCategory } from './reports/hazards/compliance-by-category';
import { hazardsElementMonthlyTrend } from './reports/hazards/element-monthly-trend';
import { hazardsRiskRating } from './reports/hazards/risk-rating';
import { hazardsRiskCompliance } from './reports/hazards/risk-compliance';
import { hazardsRuleCompliance } from './reports/hazards/rule-compliance';
import { hazardsByDepartment } from './reports/hazards/hazards-by-department';
import { hazardsByAssessor } from './reports/hazards/hazards-by-assessor';
import { hazardsDetailedReport } from './reports/hazards/detailed-report';

import { incidentsComplianceByCategory } from './reports/incidents/compliance-by-category';
import { incidentsComplianceByElement } from './reports/incidents/compliance-by-element';
import { incidentsRiskCompliance } from './reports/incidents/risk-compliance';
import { incidentsRuleCompliance } from './reports/incidents/rule-compliance';
import { incidentsImmediateCauseAnalysis } from './reports/incidents/immediate-cause-analysis';
import { incidentsSystemAndOrganizationCauses } from './reports/incidents/system-and-organization-causes';
import { incidentsDetailedReport } from './reports/incidents/detailed-report';

import { managementsComplianceByElement } from './reports/managements/compliance-by-element';
import { managementsComplianceByCategory } from './reports/managements/compliance-by-category';

import { ccmsComplianceByCategory } from './reports/ccms/compliance-by-category';
import { ccmsComplianceByElement } from './reports/ccms/compliance-by-element';
import { ccmsRiskCompliance } from './reports/ccms/risk-compliance';
import { ccmsRuleCompliance } from './reports/ccms/rule-compliance';

export const router = express.Router();

/* GET compliance-by-element report */
router.get('/assessments/compliance-by-element', function(req, res, next) {
  assessmentsComplianceByElement(req, res);
});

/* GET compliance-by-category report */
router.get('/assessments/compliance-by-category', function(req, res, next) {
  assessmentsComplianceByCategory(req, res);
});

/* GET element-monthly-trend report */
router.get('/assessments/element-monthly-trend', function(req, res, next) {
  assessmentsElementMonthlyTrend(req, res);
});

/* GET risk-rating report */
router.get('/assessments/risk-rating', function(req, res, next) {
  assessmentsRiskRating(req, res);
});

/* GET risk-compliance report */
router.get('/assessments/risk-compliance', function(req, res, next) {
  assessmentsRiskCompliance(req, res);
});

/* GET rule-compliance report */
router.get('/assessments/rule-compliance', function(req, res, next) {
  assessmentsRuleCompliance(req, res);
});

/* GET assessments-by-department report */
router.get('/assessments/assessments-by-department', function(req, res, next) {
  assessmentsByDepartment(req, res);
});

/* GET assessments-by-assessor report */
router.get('/assessments/assessments-by-assessor', function(req, res, next) {
  assessmentsByAssessor(req, res);
});

/* GET assessments detailed report */
router.get('/assessments/detailed-report', function(req, res, next) {
  assessmentsDetailedReport(req, res);
});

/* GET compliance-by-element report */
router.get('/inspections/compliance-by-element', function(req, res, next) {
  inspectionsComplianceByElement(req, res);
});

/* GET compliance-by-category report */
router.get('/inspections/compliance-by-category', function(req, res, next) {
  inspectionsComplianceByCategory(req, res);
});

/* GET element-monthly-trend report */
router.get('/inspections/element-monthly-trend', function(req, res, next) {
  inspectionsElementMonthlyTrend(req, res);
});

/* GET risk-rating report */
router.get('/inspections/risk-rating', function(req, res, next) {
  inspectionsRiskRating(req, res);
});

/* GET risk-compliance report */
router.get('/inspections/risk-compliance', function(req, res, next) {
  inspectionsRiskCompliance(req, res);
});

/* GET rule-compliance report */
router.get('/inspections/rule-compliance', function(req, res, next) {
  inspectionsRuleCompliance(req, res);
});

/* GET inspections-by-department report */
router.get('/inspections/inspections-by-department', function(req, res, next) {
  inspectionsByDepartment(req, res);
});

/* GET inspections-by-assessor report */
router.get('/inspections/inspections-by-assessor', function(req, res, next) {
  inspectionsByAssessor(req, res);
});

/* GET inspections detailed report */
router.get('/inspections/detailed-report', function(req, res, next) {
  inspectionsDetailedReport(req, res);
});

/* GET compliance-by-element report */
router.get('/hazards/compliance-by-element', function(req, res, next) {
  hazardsComplianceByElement(req, res);
});

/* GET compliance-by-category report */
router.get('/hazards/compliance-by-category', function(req, res, next) {
  hazardsComplianceByCategory(req, res);
});

/* GET element-monthly-trend report */
router.get('/hazards/element-monthly-trend', function(req, res, next) {
  hazardsElementMonthlyTrend(req, res);
});

/* GET risk-rating report */
router.get('/hazards/risk-rating', function(req, res, next) {
  hazardsRiskRating(req, res);
});

/* GET risk-compliance report */
router.get('/hazards/risk-compliance', function(req, res, next) {
  hazardsRiskCompliance(req, res);
});

/* GET rule-compliance report */
router.get('/hazards/rule-compliance', function(req, res, next) {
  hazardsRuleCompliance(req, res);
});

/* GET hazards-by-department report */
router.get('/hazards/hazards-by-department', function(req, res, next) {
  hazardsByDepartment(req, res);
});

/* GET hazards-by-assessor report */
router.get('/hazards/hazards-by-assessor', function(req, res, next) {
  hazardsByAssessor(req, res);
});

/* GET hazards detailed report */
router.get('/hazards/detailed-report', function(req, res, next) {
  hazardsDetailedReport(req, res);
});


/* GET damaging energies report */
router.get('/incidents/compliance-by-category', function(req, res, next) {
  incidentsComplianceByCategory(req, res);
});

/* GET compliance-by-element report */
router.get('/incidents/compliance-by-element', function(req, res, next) {
  incidentsComplianceByElement(req, res);
});

/* GET risk-compliance report */
router.get('/incidents/risk-compliance', function(req, res, next) {
  incidentsRiskCompliance(req, res);
});

/* GET immediate cause analysis report */
router.get('/incidents/immediate-cause-analysis', function(req, res, next) {
  incidentsImmediateCauseAnalysis(req, res);
});

/* GET system and organization causes report */
router.get('/incidents/system-and-organization-causes', function(req, res, next) {
  incidentsSystemAndOrganizationCauses(req, res);
});

/* GET rule compliance report */
router.get('/incidents/rule-compliance', function(req, res, next) {
  incidentsRuleCompliance(req, res);
});

/* GET incidents detailed report */
router.get('/incidents/detailed-report', function(req, res, next) {
  incidentsDetailedReport(req, res);
});

/* GET compliance-by-element report */
router.get('/managements/compliance-by-element', function(req, res, next) {
  managementsComplianceByElement(req, res);
});

/* GET compliance-by-category report */
router.get('/managements/compliance-by-category', function(req, res, next) {
  managementsComplianceByCategory(req, res);
});

/* GET compliance-by-category report */
router.get('/ccms/compliance-by-category', function(req, res, next) {
  ccmsComplianceByCategory(req, res);
});

/* GET compliance-by-element report */
router.get('/ccms/compliance-by-element', function(req, res, next) {
  ccmsComplianceByElement(req, res);
});

/* GET risk-compliance report */
router.get('/ccms/risk-compliance', function(req, res, next) {
  ccmsRiskCompliance(req, res);
});

/* GET rule-compliance report */
router.get('/ccms/rule-compliance', function(req, res, next) {
  ccmsRuleCompliance(req, res);
});
