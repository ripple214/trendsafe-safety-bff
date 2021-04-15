import express from 'express';

import { assessmentsComplianceByElement } from './reports/assessments/compliance-by-element';
import { assessmentsComplianceByCategory } from './reports/assessments/compliance-by-category';
import { assessmentsElementMonthlyTrend } from './reports/assessments/element-monthly-trend';
import { assessmentsRiskRating } from './reports/assessments/risk-rating';
import { assessmentsRiskCompliance } from './reports/assessments/risk-compliance';
import { assessmentsRuleCompliance } from './reports/assessments/rule-compliance';
import { assessmentsByDepartment } from './reports/assessments/assessments-by-department';
import { assessmentsByAssessor } from './reports/assessments/assessments-by-assessor';

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