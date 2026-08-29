import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from '../shared/http.js';

export const commentRouter = Router();
const schema=z.object({authorId:z.string().min(1),body:z.string().trim().min(1).max(10000)});
commentRouter.get('/issues/:issueId/comments',async(req,res,next)=>{try{const r=await query(`SELECT c.*,u.display_name author_name FROM issue_comments c JOIN users u ON u.id=c.author_id WHERE c.issue_id=$1 ORDER BY c.created_at ASC`,[req.params.issueId]);res.json({data:r.rows.map(c=>({id:c.id,issueId:c.issue_id,authorId:c.author_id,authorName:c.author_name,body:c.body,createdAt:c.created_at,updatedAt:c.updated_at}))});}catch(e){next(e);}});
commentRouter.post('/issues/:issueId/comments',async(req,res,next)=>{try{const d=schema.parse(req.body);if(!(await query('SELECT 1 FROM issues WHERE id=$1',[req.params.issueId])).rowCount)throw new HttpError(404,'ISSUE_NOT_FOUND','Issue does not exist.');const id=`com_${Date.now().toString(36)}`;const r=await query('INSERT INTO issue_comments(id,issue_id,author_id,body) VALUES($1,$2,$3,$4) RETURNING *',[id,req.params.issueId,d.authorId,d.body]);res.status(201).json({data:r.rows[0]});}catch(e){next(e);}});
