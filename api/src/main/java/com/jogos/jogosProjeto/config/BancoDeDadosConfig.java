package com.jogos.jogosProjeto.config;

import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

@Configuration
public class BancoDeDadosConfig {

    // cria o banco antes de o Spring abrir o pool de conexões, se ele ainda não existir
    @Bean
    public DataSource dataSource(DataSourceProperties propriedades) {
        criarBancoSeNaoExistir(propriedades.getUrl(), propriedades.getUsername(), propriedades.getPassword());
        return propriedades.initializeDataSourceBuilder().build();
    }

    private void criarBancoSeNaoExistir(String url, String usuario, String senha) {
        // jdbc:postgresql://host:porta/nomeDoBanco?parametros
        int inicioNome = url.lastIndexOf('/') + 1;
        int fimNome = url.indexOf('?', inicioNome);
        if (fimNome == -1) {
            fimNome = url.length();
        }
        String nomeBanco = url.substring(inicioNome, fimNome);
        String urlPostgres = url.substring(0, inicioNome) + "postgres" + url.substring(fimNome);

        try (Connection conexao = DriverManager.getConnection(urlPostgres, usuario, senha)) {
            try (PreparedStatement consulta = conexao.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
                consulta.setString(1, nomeBanco);
                try (ResultSet resultado = consulta.executeQuery()) {
                    if (resultado.next()) {
                        return;
                    }
                }
            }
            try (Statement comando = conexao.createStatement()) {
                // aspas mantêm as maiúsculas do nome (ex.: jogosProjetoApi)
                comando.executeUpdate("CREATE DATABASE \"" + nomeBanco.replace("\"", "\"\"") + "\"");
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Não foi possível verificar/criar o banco " + nomeBanco, e);
        }
    }
}
