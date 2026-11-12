import type { Table } from '../engine/index.ts';
import type { Copy } from './copy-type.ts';
import { readJson } from './dom.ts';
import { mountApp } from './mount.ts';

const table = readJson<Table>('data-table');
const copy = readJson<Copy>('data-copy');
mountApp(document.body, table, copy, {});
