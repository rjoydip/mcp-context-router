import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import ts from 'typescript'

const execFileAsync = promisify(execFile)

export class LocalGitAst {
  readonly root: string
  constructor(root = process.env.CODEBASE_ROOT ?? process.cwd()) {
    this.root = path.resolve(root)
  }
  private async git(args: string[]) {
    return (
      await execFileAsync('git', args, { cwd: this.root, maxBuffer: 2 * 1024 * 1024 })
    ).stdout.trim()
  }
  status() {
    return this.git(['status', '--short', '--branch'])
  }
  async log(limit = 10) {
    try {
      return await this.git([
        'log',
        `-${Math.min(Math.max(limit, 1), 50)}`,
        '--date=iso',
        '--pretty=format:%h|%ad|%an|%s'
      ])
    } catch {
      // Handle case where git log fails (e.g., no commits). The git call is
      // async, so the failure surfaces as a rejection that only an awaited
      // try/catch can observe.
      return ''
    }
  }
  diff(staged = false) {
    return this.git(staged ? ['diff', '--cached'] : ['diff'])
  }
  async symbols(file: string) {
    const absolute = path.resolve(this.root, file)
    if (!absolute.startsWith(this.root + path.sep)) throw new Error('File is outside CODEBASE_ROOT')
    const source = await readFile(absolute, 'utf8')
    const kind = absolute.endsWith('.tsx')
      ? ts.ScriptKind.TSX
      : absolute.endsWith('.jsx')
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.TS
    const sourceFile = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true, kind)
    const symbols: Array<{ kind: string; name: string; line: number }> = []
    const visit = (node: ts.Node) => {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isVariableStatement(node)
      ) {
        const name =
          'name' in node && node.name && ts.isIdentifier(node.name)
            ? node.name.text
            : ts.isVariableStatement(node)
              ? node.declarationList.declarations.map((d) => d.name.getText(sourceFile)).join(', ')
              : '<anonymous>'
        symbols.push({
          kind: ts.SyntaxKind[node.kind],
          name,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return { file, symbols }
  }
}
