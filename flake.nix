{
  description = "A basic flake with a shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShell = with pkgs; pkgs.mkShell {
          nativeBuildInputs = [ ];
          buildInputs = [
            nodejs-18_x
            yarn
            nodePackages.ionic
            nodePackages."@angular/cli"
          ];
        };
      });
}

