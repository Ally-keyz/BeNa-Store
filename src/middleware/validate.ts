import type { Response } from 'express';
import { ZodError, type ZodType } from 'zod';

export interface RequestSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

export interface ValidatedRequest {
  params: unknown;
  query: unknown;
  body: unknown;
}

export function validate(schemas: RequestSchemas) {
  return (req: import('express').Request, res: Response, next: import('express').NextFunction) => {
    try {
      const validated: ValidatedRequest = {
        params: schemas.params ? schemas.params.parse(req.params) : req.params,
        query: schemas.query ? schemas.query.parse(req.query) : req.query,
        body: schemas.body ? schemas.body.parse(req.body) : req.body,
      };
      res.locals.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
        return;
      }
      next(error);
    }
  };
}

export function getValidated<T extends Partial<ValidatedRequest>>(res: Response): T {
  return (res.locals.validated ?? {}) as T;
}
