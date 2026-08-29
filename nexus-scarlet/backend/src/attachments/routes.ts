import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from '../shared/http.js';
import { recordAuditEvent } from '../audit/service.js';

export const attachmentRouter=Router();
const schema=z.object({uploadedBy:z.string().min(1).optional(),fileName:z.string().trim().min(1).max(255),contentType:z.string().trim().min(1).max(160),objectKey:z.string().trim().min(1).max(512),sizeBytes:z.coerce.number().int().nonnegative()});
attachmentRouter.get('/issues/:issueId/attachments',async(req,res,next)=>{try{const r=await query('SELECT * FROM attachments WHERE issue_id=$1 ORDER BY created_at DESC',[req.params.issueId]);res.json({data:r.rows});}catch(e){next(e);}});
attachmentRouter.post('/issues/:issueId/attachments',async(req,res,next)=>{try{
  if (!(req as any).user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  const d=schema.parse(req.body);
  const uploadedBy = (req as any).user.id;
  if(!(await query('SELECT 1 FROM issues WHERE id=$1',[req.params.issueId])).rowCount)throw new HttpError(404,'ISSUE_NOT_FOUND','Issue does not exist.');
  const id=`att_${Date.now().toString(36)}`;
  const r=await query(`INSERT INTO attachments(id,issue_id,uploaded_by,file_name,content_type,object_key,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[id,req.params.issueId,uploadedBy,d.fileName,d.contentType,d.objectKey,d.sizeBytes]);
  
  await recordAuditEvent({
    actorId: uploadedBy,
    action: 'attachment.upload',
    resourceType: 'attachment',
    resourceId: r.rows[0].id,
    metadata: { issueId: req.params.issueId, fileName: d.fileName }
  });

  res.status(201).json({data:r.rows[0]});
}catch(e){next(e);}});
