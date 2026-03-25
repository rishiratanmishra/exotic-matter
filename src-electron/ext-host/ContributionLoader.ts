import { CommandRegistry } from '../core/CommandRegistry';

export class ContributionLoader {
  /**
   * Parses the package.json dictates from the extension and registers placeholders 
   * logic bindings in the Core IDE so UI components (menus, palettes, shortcuts) sync.
   */
  public static parseAndRegister(manifest: any, activeWorkspaceConfig?: any) {
    if (!manifest.contributes) return;

    if (manifest.contributes.commands) {
      manifest.contributes.commands.forEach((cmd: any) => {
        // Registers command so it can be invoked via Palette or Agent
        CommandRegistry.registerRemote(cmd.command, manifest.name);
        console.log(`[Contributions] Registered Command: ${cmd.title} (${cmd.command})`);
      });
    }

    if (manifest.contributes.menus) {
      Object.keys(manifest.contributes.menus).forEach(menuContext => {
        const elements = manifest.contributes.menus[menuContext];
        console.log(`[Contributions] Bound ${elements.length} items to Menu: ${menuContext}`);
      });
    }
    
    if (manifest.contributes.languages) {
      manifest.contributes.languages.forEach((lang: any) => {
        console.log(`[Contributions] Registered Language Context: ${lang.id}`);
      });
    }
  }
}
