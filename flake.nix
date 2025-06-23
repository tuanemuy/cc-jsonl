{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/master";
    systems.url = "github:nix-systems/default";
  };

  outputs =
    {
      self,
      nixpkgs,
      systems,
    }:
    let
      mapSupportedSystems = nixpkgs.lib.genAttrs (import systems);
      forEachSupportedSystem = f: mapSupportedSystems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forEachSupportedSystem (pkgs: {
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            pnpm
            vtsls
            tailwindcss-language-server
            biome
            jdk17
            alloy6
            tlaplus
          ];
        };
      });
    };
}
